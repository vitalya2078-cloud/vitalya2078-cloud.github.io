package ru.physics.app.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import ru.physics.app.data.FavoriteEntity
import ru.physics.app.data.LessonProgressEntity
import ru.physics.app.data.LocalActivityRepository
import ru.physics.app.data.OfficialQuestion
import ru.physics.app.data.OfficialQuestionBank
import ru.physics.app.data.OfficialQuestionBankRepository
import ru.physics.app.data.TestAttemptEntity
import ru.physics.app.domain.gradeFromScore
import java.util.UUID

private enum class TestMode(val label: String, val databaseValue: String) {
    TRAINING("Тренировка", "training"),
    FINAL("Итоговый тест", "final"),
}

private data class TestQuestion(
    val question: OfficialQuestion,
    val options: List<String>?,
)

private data class TestAnswer(
    val question: OfficialQuestion,
    val selectedValue: String,
    val isCorrect: Boolean,
)

private data class TestSession(
    val questions: List<TestQuestion>,
    val mode: TestMode,
    val topicCode: String?,
    val startedAt: Long,
    val currentIndex: Int = 0,
    val answers: List<TestAnswer> = emptyList(),
    val currentAnswer: TestAnswer? = null,
    val answerRevealed: Boolean = false,
    val saving: Boolean = false,
    val finished: Boolean = false,
    val scorePercent: Int? = null,
    val grade: Int? = null,
    val attemptId: String = UUID.randomUUID().toString(),
    val saveError: String? = null,
)

@Composable
fun TestingScreen(
    bankRepository: OfficialQuestionBankRepository,
    activityRepository: LocalActivityRepository,
    illustrationRepository: QuestionIllustrationRepository,
) {
    val scope = rememberCoroutineScope()
    var bank by remember { mutableStateOf<OfficialQuestionBank?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var selectedTopic by rememberSaveable { mutableStateOf("all") }
    var selectedMode by rememberSaveable { mutableStateOf(TestMode.TRAINING.name) }
    var questionCount by rememberSaveable { mutableIntStateOf(10) }
    var session by remember { mutableStateOf<TestSession?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(bankRepository) {
        loading = true
        runCatching { bankRepository.load() }
            .onSuccess { bank = it }
            .onFailure { loadError = it.message ?: "Не удалось открыть официальный банк вопросов." }
        loading = false
    }

    val mode = TestMode.valueOf(selectedMode)
    val topicFilter = selectedTopic.takeIf { it != "all" }
    val availableQuestions = bank?.questionsForTopic(topicFilter).orEmpty()
    val eligibleQuestions = if (mode == TestMode.FINAL) {
        availableQuestions.filter { it.wrongOptions.isNotEmpty() }
    } else {
        availableQuestions
    }

    ScreenTitle(
        title = "Тестирование",
        description = "Официальный банк из 900 вопросов доступен локально. Тесты можно проходить без интернета.",
    )

    if (loading) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            CircularProgressIndicator()
            Text("Проверяем целостность банка вопросов…")
        }
        return
    }

    loadError?.let {
        InfoCard("Банк вопросов недоступен", it)
        return
    }

    val loadedBank = bank ?: return
    val currentSession = session

    if (currentSession == null) {
        Text("Выбери тему", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilterChip(
                selected = selectedTopic == "all",
                onClick = { selectedTopic = "all" },
                label = { Text("Все темы") },
            )
            loadedBank.topicNames().forEach { (code, title) ->
                FilterChip(
                    selected = selectedTopic == code,
                    onClick = { selectedTopic = code },
                    label = { Text(title) },
                )
            }
        }

        Text("Режим", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TestMode.entries.forEach { item ->
                FilterChip(
                    selected = selectedMode == item.name,
                    onClick = { selectedMode = item.name },
                    label = { Text(item.label) },
                )
            }
        }

        Text(
            if (mode == TestMode.TRAINING) {
                "Тренировка: без оценки и штрафов. После каждого ответа будет разбор."
            } else {
                "Итоговый тест: результат переводится в оценку по утверждённой шкале."
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Text("Количество вопросов", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(10, 20, 30).forEach { count ->
                FilterChip(
                    selected = questionCount == count,
                    onClick = { questionCount = count },
                    label = { Text(count.toString()) },
                )
            }
        }

        InfoCard(
            title = "Доступно",
            body = if (mode == TestMode.FINAL) {
                "${eligibleQuestions.size} вопросов с вариантами ответа. В итоговый тест включаются вопросы с выбором ответа."
            } else {
                "${eligibleQuestions.size} вопросов по выбранной теме. В тренировке доступны и вопросы без вариантов."
            },
        )

        Button(
            enabled = eligibleQuestions.isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                val selected = eligibleQuestions.shuffled().take(questionCount).map { question ->
                    val options = if (question.wrongOptions.isEmpty()) {
                        null
                    } else {
                        (listOf(question.correctAnswer) + question.wrongOptions).shuffled()
                    }
                    TestQuestion(question, options)
                }
                session = TestSession(
                    questions = selected,
                    mode = mode,
                    topicCode = topicFilter,
                    startedAt = System.currentTimeMillis(),
                )
            },
        ) {
            Text("Начать тест")
        }

        InfoCard(
            title = "Сохранность банка",
            body = "Формулировки, варианты, правильные ответы и пояснения загружены из утверждённого неизменяемого снимка. В приложении они не редактируются.",
        )
        return
    }

    if (currentSession.finished) {
        val correctCount = currentSession.answers.count { it.isCorrect }
        val totalCount = currentSession.questions.size
        Text(
            if (currentSession.mode == TestMode.TRAINING) "Тренировка завершена" else "Итоговый результат",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(
            "$correctCount из $totalCount правильных ответов",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        if (currentSession.mode == TestMode.FINAL) {
            InfoCard(
                title = "Оценка: ${currentSession.grade}",
                body = when (currentSession.grade) {
                    5 -> "Освоен на отлично"
                    4 -> "Хорошо освоен"
                    3 -> "Освоен"
                    else -> "Не освоен. Рекомендуется повторить материал."
                },
            )
        } else {
            InfoCard("Без оценки", "Тренировка не влияет на итоговую оценку. Ошибки сохранены для последующего повторения.")
        }
        Button(
            modifier = Modifier.fillMaxWidth(),
            onClick = { session = null },
        ) {
            Text("К настройкам теста")
        }
        return
    }

    val questionItem = currentSession.questions[currentSession.currentIndex]
    val question = questionItem.question
    val answer = currentSession.currentAnswer
    val progress = (currentSession.currentIndex + 1).toFloat() / currentSession.questions.size

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            "Вопрос ${currentSession.currentIndex + 1} из ${currentSession.questions.size}",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(question.topicTitle, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    LinearProgressIndicator(progress = progress, modifier = Modifier.fillMaxWidth())
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(question.text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            question.illustrationRef?.let { QuestionIllustration(it, illustrationRepository) }

            if (questionItem.options != null) {
                questionItem.options.forEach { option ->
                    val isCorrectOption = option == question.correctAnswer
                    val isSelectedWrong = answer?.let { it.selectedValue == option && !it.isCorrect } == true
                    val label = when {
                        answer == null -> option
                        isCorrectOption -> "✓  $option"
                        isSelectedWrong -> "✕  $option"
                        else -> option
                    }
                    OutlinedButton(
                        enabled = answer == null,
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            val isCorrect = option == question.correctAnswer
                            val response = TestAnswer(question, option, isCorrect)
                            session = currentSession.copy(
                                answers = currentSession.answers + response,
                                currentAnswer = response,
                            )
                            if (!isCorrect) {
                                scope.launch { activityRepository.recordMistake(question.id) }
                            }
                        },
                    ) {
                        Text(label)
                    }
                }
            } else {
                Text(
                    "В этом вопросе нет вариантов выбора. Сначала вспомни ответ самостоятельно.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (!currentSession.answerRevealed && answer == null) {
                    OutlinedButton(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { session = currentSession.copy(answerRevealed = true) },
                    ) {
                        Text("Показать ответ")
                    }
                }
                if (currentSession.answerRevealed || answer != null) {
                    InfoCard("Правильный ответ", question.correctAnswer)
                }
                if (answer == null && currentSession.answerRevealed) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            modifier = Modifier.weight(1f),
                            onClick = {
                                val response = TestAnswer(question, "self_known", true)
                                session = currentSession.copy(
                                    answers = currentSession.answers + response,
                                    currentAnswer = response,
                                )
                            },
                        ) { Text("Знал") }
                        OutlinedButton(
                            modifier = Modifier.weight(1f),
                            onClick = {
                                val response = TestAnswer(question, "self_unknown", false)
                                session = currentSession.copy(
                                    answers = currentSession.answers + response,
                                    currentAnswer = response,
                                )
                                scope.launch { activityRepository.recordMistake(question.id) }
                            },
                        ) { Text("Не знал") }
                    }
                }
            }

            answer?.let {
                InfoCard(
                    title = if (it.isCorrect) "Верно" else "Неверно",
                    body = if (it.isCorrect) {
                        "Ответ принят."
                    } else {
                        "Правильный ответ: ${question.correctAnswer}"
                    },
                )
                ExplanationCard(question)
            }
        }
    }

    currentSession.saveError?.let {
        InfoCard("Не удалось сохранить результат", it)
    }

    if (answer != null) {
        Button(
            enabled = !currentSession.saving,
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                if (currentSession.currentIndex < currentSession.questions.lastIndex) {
                    session = currentSession.copy(
                        currentIndex = currentSession.currentIndex + 1,
                        currentAnswer = null,
                        answerRevealed = false,
                    )
                } else {
                    scope.launch {
                        val latest = session ?: return@launch
                        val correctCount = latest.answers.count { it.isCorrect }
                        val score = (correctCount * 100) / latest.questions.size
                        val grade = if (latest.mode == TestMode.FINAL) gradeFromScore(score) else null
                        val completedAt = System.currentTimeMillis()
                        val answerPayload = JSONArray().apply {
                            latest.answers.forEach { result ->
                                put(
                                    JSONObject()
                                        .put("questionId", result.question.id)
                                        .put("selectedValue", result.selectedValue)
                                        .put("isCorrect", result.isCorrect),
                                )
                            }
                        }

                        val progressId = latest.topicCode ?: "official-900"
                        val progress = if (grade != null) {
                            LessonProgressEntity(
                                contentType = if (latest.topicCode == null) "legacy_bank_set" else "legacy_topic",
                                contentId = progressId,
                                status = if (grade >= 3) "mastered" else "in_progress",
                                completionPercent = score,
                                bestScore = score,
                                bestGrade = grade,
                                latestGrade = grade,
                                updatedAt = completedAt,
                            )
                        } else {
                            null
                        }

                        val attempt = TestAttemptEntity(
                            id = latest.attemptId,
                            testId = latest.topicCode ?: "official-900",
                            mode = latest.mode.databaseValue,
                            scorePercent = score,
                            grade = grade,
                            startedAt = latest.startedAt,
                            completedAt = completedAt,
                            answersJson = answerPayload.toString(),
                        )

                        session = latest.copy(saving = true, saveError = null)
                        try {
                            activityRepository.saveAssessmentResult(attempt, progress)
                            session = latest.copy(
                                saving = false,
                                finished = true,
                                scorePercent = score,
                                grade = grade,
                            )
                        } catch (error: Exception) {
                            session = latest.copy(
                                saving = false,
                                saveError = error.message ?: "Не удалось сохранить результат. Попробуй ещё раз.",
                            )
                        }
                    }
                }
            },
        ) {
            Text(
                when {
                    currentSession.saving -> "Сохраняем результат…"
                    currentSession.currentIndex == currentSession.questions.lastIndex -> "Завершить тест"
                    else -> "Следующий вопрос"
                },
            )
        }
    }
}

@Composable
private fun QuestionIllustration(
    fileName: String,
    repository: QuestionIllustrationRepository,
) {
    var bitmap by remember(fileName) { mutableStateOf<Bitmap?>(null) }
    var loading by remember(fileName) { mutableStateOf(true) }

    LaunchedEffect(fileName, repository) {
        bitmap = repository.load(fileName)
        loading = false
    }

    when {
        bitmap != null -> Image(
            bitmap = bitmap!!.asImageBitmap(),
            contentDescription = "Иллюстрация к вопросу",
            modifier = Modifier.fillMaxWidth().heightIn(max = 260.dp),
            contentScale = ContentScale.Fit,
        )
        loading -> Text("Загружаем иллюстрацию…", style = MaterialTheme.typography.bodySmall)
        else -> Text(
            "Иллюстрация пока не сохранена на устройстве. Если подключиться к интернету, она загрузится и останется в кеше.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ExplanationCard(question: OfficialQuestion) {
    val objectExplanation = question.explanationPrompt != null
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Пояснение", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        if (objectExplanation) {
            InfoCard("Что спрашивают", question.explanationPrompt.orEmpty())
            InfoCard("Главная идея", question.explanationIdea.orEmpty())
            InfoCard("Решение", question.explanationSolution.orEmpty())
        } else if (question.explanation.isNotBlank()) {
            InfoCard("Разбор", question.explanation)
        }
    }
}

@Composable
private fun ScreenTitle(title: String, description: String) {
    Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
    Text(description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun InfoCard(title: String, body: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
