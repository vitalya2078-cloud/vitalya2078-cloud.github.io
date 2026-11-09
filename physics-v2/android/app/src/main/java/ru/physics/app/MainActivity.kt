package ru.physics.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalConfiguration
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import org.json.JSONObject
import ru.physics.app.data.LocalActivityRepository
import ru.physics.app.data.CatalogRepository
import ru.physics.app.data.CatalogSummary
import ru.physics.app.data.PhysicsDatabase
import ru.physics.app.data.PhysicsDao
import ru.physics.app.data.ProfileEntity
import ru.physics.app.data.MistakeEntity
import ru.physics.app.data.OfficialQuestion
import ru.physics.app.data.OfficialQuestionBankRepository
import ru.physics.app.ui.QuestionIllustrationRepository
import ru.physics.app.ui.TestingScreen
import ru.physics.app.domain.calculateFreeFall
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val database = PhysicsDatabase.getInstance(applicationContext)
        val localRepository = LocalActivityRepository(database)
        val questionBankRepository = OfficialQuestionBankRepository(applicationContext)
        val illustrationRepository = QuestionIllustrationRepository(applicationContext)

        setContent {
            val profile by database.physicsDao()
                .observeProfile()
                .collectAsStateWithLifecycle(initialValue = null)

            PhysicsTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    if (profile == null) {
                        ProfileSetupScreen(
                            onSave = { nickname, tracks, levels ->
                                localRepository.saveProfile(
                                    ProfileEntity(
                                        nickname = nickname.trim().ifBlank { "Исследователь" },
                                        birthYear = null,
                                        educationTracks = tracks.sorted().joinToString(","),
                                        gradeLevel = levels.values.singleOrNull(),
                                        educationTrackLevels = JSONObject(levels).toString(),
                                        updatedAt = System.currentTimeMillis(),
                                    ),
                                )
                            },
                        )
                    } else {
                        NativeHome(
                            profile = profile!!,
                            dao = database.physicsDao(),
                            activityRepository = localRepository,
                            questionBankRepository = questionBankRepository,
                            illustrationRepository = illustrationRepository,
                        )
                    }
                }
            }
        }
    }
}

private enum class AppSection(val label: String) {
    HOME("Главная"),
    LEARNING("Обучение"),
    TESTING("Тесты"),
    LAB("Лаборатория"),
    PROGRESS("Прогресс"),
    PROFILE("Профиль"),
}

@Composable
private fun NativeHome(
    profile: ProfileEntity,
    dao: PhysicsDao,
    activityRepository: LocalActivityRepository,
    questionBankRepository: OfficialQuestionBankRepository,
    illustrationRepository: QuestionIllustrationRepository,
) {
    var selectedSection by rememberSaveable { mutableStateOf(AppSection.HOME) }
    val progressCount by dao.observeProgressCount().collectAsStateWithLifecycle(initialValue = 0)
    val attemptCount by dao.observeAttemptCount().collectAsStateWithLifecycle(initialValue = 0)
    val mistakeCount by dao.observeOpenMistakeCount().collectAsStateWithLifecycle(initialValue = 0)
    val openMistakes by dao.observeOpenMistakes().collectAsStateWithLifecycle(initialValue = emptyList())
    val pendingSyncCount by dao.observePendingSyncCount().collectAsStateWithLifecycle(initialValue = 0)

    val screenWidth = LocalConfiguration.current.screenWidthDp
    val isExpanded = screenWidth >= 700
    val isCompact = screenWidth < 390

    androidx.compose.material3.Scaffold(
        topBar = {
            Row(
                modifier = Modifier.fillMaxWidth()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(
                        start = if (isExpanded) 28.dp else 16.dp,
                        end = if (isExpanded) 24.dp else 12.dp,
                        top = 10.dp,
                        bottom = 8.dp,
                    ),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                    Text("PHYSICS", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, letterSpacing = 2.sp)
                    Text("ПРОСТРАНСТВО ЗНАНИЙ", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 1.4.sp)
                }
                IconButton(onClick = { selectedSection = AppSection.PROFILE }) {
                    androidx.compose.material3.Icon(Icons.Default.Person, contentDescription = "Профиль", tint = MaterialTheme.colorScheme.primary)
                }
            }
        },
        bottomBar = {
            if (!isExpanded) {
                NavigationBar {
                    AppSection.entries.forEach { section ->
                        val icon = when (section) {
                            AppSection.HOME -> Icons.Default.Home
                            AppSection.LEARNING -> Icons.Default.MenuBook
                            AppSection.TESTING -> Icons.Default.Quiz
                            AppSection.LAB -> Icons.Default.Science
                            AppSection.PROGRESS -> Icons.Default.Timeline
                            AppSection.PROFILE -> Icons.Default.Person
                        }
                        NavigationBarItem(
                            selected = selectedSection == section,
                            onClick = { selectedSection = section },
                            icon = { androidx.compose.material3.Icon(icon, contentDescription = section.label) },
                            label = if (isCompact) null else ({ Text(section.label, maxLines = 1, softWrap = false) }),
                        )
                    }
                }
            }
        },
    ) { padding ->
        Row(
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            if (isExpanded) {
                NavigationRail {
                    AppSection.entries.forEach { section ->
                        val icon = when (section) {
                            AppSection.HOME -> Icons.Default.Home
                            AppSection.LEARNING -> Icons.Default.MenuBook
                            AppSection.TESTING -> Icons.Default.Quiz
                            AppSection.LAB -> Icons.Default.Science
                            AppSection.PROGRESS -> Icons.Default.Timeline
                            AppSection.PROFILE -> Icons.Default.Person
                        }
                        NavigationRailItem(
                            selected = selectedSection == section,
                            onClick = { selectedSection = section },
                            icon = { androidx.compose.material3.Icon(icon, contentDescription = section.label) },
                            label = { Text(section.label, maxLines = 1) },
                            alwaysShowLabel = true,
                        )
                    }
                }
            }
            Box(modifier = Modifier.weight(1f).fillMaxSize()) {
                Column(
                    modifier = Modifier
                        .widthIn(max = 1100.dp)
                        .fillMaxSize()
                        .align(Alignment.TopCenter)
                        .verticalScroll(rememberScrollState())
                        .padding(
                            horizontal = when {
                                screenWidth < 360 -> 14.dp
                                isExpanded -> 32.dp
                                else -> 20.dp
                            },
                            vertical = if (isExpanded) 26.dp else 18.dp,
                        ),
                    verticalArrangement = Arrangement.spacedBy(if (isExpanded) 20.dp else 16.dp),
                ) {
                    when (selectedSection) {
                        AppSection.HOME -> HomeScreen(profile.nickname, onOpen = { selectedSection = it })
                        AppSection.LEARNING -> LearningScreen(dao)
                        AppSection.TESTING -> TestingScreen(questionBankRepository, activityRepository, illustrationRepository)
                        AppSection.LAB -> LaboratoryScreen()
                        AppSection.PROGRESS -> ProgressScreen(
                            progressCount,
                            attemptCount,
                            mistakeCount,
                            pendingSyncCount,
                            openMistakes,
                            questionBankRepository,
                            activityRepository,
                        )
                        AppSection.PROFILE -> ProfileScreen(profile)
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeScreen(nickname: String, onOpen: (AppSection) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(22.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("ТВОЯ УЧЕБНАЯ СРЕДА", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, letterSpacing = 1.8.sp, fontWeight = FontWeight.Bold)
            Text("С возвращением, $nickname", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Выбирай направление и двигайся в своём темпе.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = Color(0xFF7655D9),
        ) {
            Box(
                modifier = Modifier.background(
                    Brush.linearGradient(
                        listOf(Color(0xFFAA91F4), Color(0xFF7655D9), Color(0xFF49338D)),
                    ),
                ).padding(22.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(13.dp)) {
                    Text("ОТКРЫВАЙ ЗАКОНЫ МИРА", style = MaterialTheme.typography.labelSmall, color = Color(0xFFFFE69A), letterSpacing = 1.7.sp, fontWeight = FontWeight.Bold)
                    Text("Физика начинается\\nс любопытства.", style = MaterialTheme.typography.headlineMedium, color = Color.White, fontWeight = FontWeight.Bold, lineHeight = 34.sp)
                    Text("Теория, задачи и эксперименты — в одном учебном пространстве.", style = MaterialTheme.typography.bodyMedium, color = Color(0xFFF4EEFF))
                    Button(onClick = { onOpen(AppSection.LEARNING) }) {
                        Text("Продолжить обучение")
                    }
                }
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("РАЗДЕЛЫ", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, letterSpacing = 1.6.sp, fontWeight = FontWeight.Bold)
            Text("Что будем изучать?", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            HomeFeatureCard(
                title = "Обучение",
                subtitle = "Курсы и уроки",
                icon = Icons.Default.MenuBook,
                accent = Color(0xFF3978E8),
                modifier = Modifier.weight(1f),
            ) { onOpen(AppSection.LEARNING) }
            HomeFeatureCard(
                title = "Тесты",
                subtitle = "Проверь знания",
                icon = Icons.Default.Quiz,
                accent = Color(0xFF8068D9),
                modifier = Modifier.weight(1f),
            ) { onOpen(AppSection.TESTING) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            HomeFeatureCard(
                title = "Лаборатория",
                subtitle = "Эксперименты",
                icon = Icons.Default.Science,
                accent = Color(0xFF168D91),
                modifier = Modifier.weight(1f),
            ) { onOpen(AppSection.LAB) }
            HomeFeatureCard(
                title = "Мой прогресс",
                subtitle = "Результаты и цели",
                icon = Icons.Default.Timeline,
                accent = Color(0xFFB17A31),
                modifier = Modifier.weight(1f),
            ) { onOpen(AppSection.PROGRESS) }
        }
    }
}

@Composable
private fun HomeFeatureCard(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    accent: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(15.dp),
            verticalArrangement = Arrangement.spacedBy(15.dp),
        ) {
            Surface(shape = RoundedCornerShape(14.dp), color = accent.copy(alpha = 0.12f)) {
                androidx.compose.material3.Icon(
                    icon,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.padding(11.dp).size(22.dp),
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    description: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            androidx.compose.material3.Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun LearningScreen(dao: PhysicsDao) {
    val repository = remember(dao) { CatalogRepository(dao) }
    var summary by remember { mutableStateOf<CatalogSummary?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    suspend fun refreshCatalog() {
        loading = true
        errorMessage = null
        try {
            summary = repository.loadPublishedCatalog()
        } catch (error: Exception) {
            errorMessage = error.message ?: "Не удалось загрузить каталог."
        } finally {
            loading = false
        }
    }

    LaunchedEffect(repository) {
        refreshCatalog()
    }

    ScreenTitle("Обучение", "Программы, разделы, темы и уроки с возможностью заниматься офлайн.")
    if (loading && summary == null) {
        InfoCard("Загружаем каталог", "Проверяем опубликованные учебные материалы. Первый запуск не требует авторизации.")
    }
    summary?.let { catalog ->
        InfoCard(
            "Опубликованный каталог",
            "Программ: ${catalog.programCount}. Тем: ${catalog.topicCount}. Уроков: ${catalog.lessonCount}.",
        )
        InfoCard(
            if (catalog.fromCache) "Офлайн-копия" else "Источник данных",
            if (catalog.fromCache) {
                "Показана сохранённая на устройстве копия каталога."
            } else {
                "Данные получены из PHYSICS API и сохранены локально."
            },
        )
        if (catalog.programCount == 0) {
            InfoCard(
                "Материалы проходят проверку",
                "Черновики учебных программ не выдаются пользователям. Опубликованные уроки появятся после редакционной и методической проверки.",
            )
        }
    }
    errorMessage?.let { InfoCard("Каталог недоступен", it) }
    Button(
        enabled = !loading,
        onClick = { scope.launch { refreshCatalog() } },
    ) {
        Text(if (loading) "Обновляем..." else "Обновить каталог")
    }
    InfoCard(
        "Офлайн-режим",
        "Загруженный каталог сохраняется в локальной базе Room. Следующий запуск сможет показать его без подключения к интернету.",
    )
}

@Composable
private fun LaboratoryScreen() {
    var height by rememberSaveable { mutableFloatStateOf(20f) }
    val result = calculateFreeFall(height.toDouble())
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFF171126),
        shape = RoundedCornerShape(26.dp),
    ) {
        Column(
            Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(15.dp),
        ) {
            Text("ЛАБОРАТОРИЯ", color = Color(0xFFBDA8FF), style = MaterialTheme.typography.labelMedium, letterSpacing = 2.sp, fontWeight = FontWeight.Bold)
            Text("Свободное падение", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Измени высоту и наблюдай, как меняются параметры движения.", color = Color(0xFFC8BEDD), style = MaterialTheme.typography.bodyMedium)
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF2A2042),
                shape = RoundedCornerShape(20.dp),
            ) {
                Column(Modifier.padding(17.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Высота старта", color = Color(0xFFC8BEDD), style = MaterialTheme.typography.labelLarge)
                    Text("${height.toInt()} м", color = Color.White, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.ExtraBold)
                    Slider(value = height, onValueChange = { height = it }, valueRange = 1f..100f)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("1 м", color = Color(0xFFC8BEDD), style = MaterialTheme.typography.labelSmall)
                        Text("100 м", color = Color(0xFFC8BEDD), style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                LabResultCard("Время падения", String.format(Locale.getDefault(), "%.2f с", result.timeSeconds), Modifier.weight(1f))
                LabResultCard("Скорость", String.format(Locale.getDefault(), "%.2f м/с", result.finalVelocityMetersPerSecond), Modifier.weight(1f))
            }
            Text("Модель: сопротивлением воздуха пренебрегаем, g = 9,81 м/с².", color = Color(0xFFC8BEDD), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun LabResultCard(title: String, value: String, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, color = Color(0xFF33274E), shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(13.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text(title, color = Color(0xFFC8BEDD), style = MaterialTheme.typography.labelSmall)
            Text(value, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun ProgressScreen(
    progressCount: Int,
    attemptCount: Int,
    mistakeCount: Int,
    pendingSyncCount: Int,
    openMistakes: List<MistakeEntity>,
    questionBankRepository: OfficialQuestionBankRepository,
    activityRepository: LocalActivityRepository,
) {
    var questionsById by remember { mutableStateOf<Map<String, OfficialQuestion>>(emptyMap()) }
    var bankError by remember { mutableStateOf<String?>(null) }
    var bankLoading by remember { mutableStateOf(true) }

    LaunchedEffect(questionBankRepository) {
        runCatching { questionBankRepository.load() }
            .onSuccess { questionsById = it.questions.associateBy(OfficialQuestion::id) }
            .onFailure { bankError = it.message ?: "Не удалось открыть банк вопросов." }
        bankLoading = false
    }

    ScreenTitle("Мой прогресс", "Статистика, история ошибок и результаты хранятся на устройстве.")
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        MetricCard("Темы", progressCount.toString(), Modifier.weight(1f))
        MetricCard("Попытки", attemptCount.toString(), Modifier.weight(1f))
    }
    MetricCard("Неразобранные ошибки", mistakeCount.toString(), Modifier.fillMaxWidth())
    MetricCard("Ожидают синхронизации", pendingSyncCount.toString(), Modifier.fillMaxWidth())
    InfoCard(
        "Синхронизация",
        "Локальное хранилище работает независимо от сети. Облачная синхронизация включится после внедрения авторизации и проверки прав доступа.",
    )

    Text("Работа над ошибками", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
    if (openMistakes.isEmpty()) {
        InfoCard("Ошибок нет", "Новые ошибки из тестов появятся здесь. После правильного повторения вопрос будет отмечен как исправленный.")
    } else if (bankLoading) {
        InfoCard("Загружаем вопросы", "Подготавливаем список для повторения.")
    } else if (bankError != null) {
        InfoCard("Банк вопросов недоступен", bankError.orEmpty())
    } else {
        openMistakes.forEach { mistake ->
            key(mistake.questionId) {
                val question = questionsById[mistake.questionId]
                if (question == null) {
                    InfoCard(
                        "Вопрос ${mistake.questionId.take(8)}",
                        "Накоплено ошибок: ${mistake.errorCount}. Не удалось сопоставить запись с локальным банком вопросов.",
                    )
                } else {
                    MistakeReviewCard(mistake, question, activityRepository)
                }
            }
        }
    }
}

@Composable
private fun MistakeReviewCard(
    mistake: MistakeEntity,
    question: OfficialQuestion,
    repository: LocalActivityRepository,
) {
    val scope = rememberCoroutineScope()
    val options = remember(question.id) {
        if (question.wrongOptions.isEmpty()) emptyList()
        else (listOf(question.correctAnswer) + question.wrongOptions).shuffled()
    }
    var revealed by rememberSaveable(question.id) { mutableStateOf(false) }
    var answered by rememberSaveable(question.id) { mutableStateOf(false) }
    var feedback by rememberSaveable(question.id) { mutableStateOf<String?>(null) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                "${question.topicTitle} · ошибок: ${mistake.errorCount}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(question.text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)

            if (options.isNotEmpty()) {
                options.forEach { option ->
                    OutlinedButton(
                        enabled = !answered,
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            answered = true
                            if (option == question.correctAnswer) {
                                feedback = "Верно. Вопрос отмечен как исправленный."
                                scope.launch { repository.markMistakeCorrected(question.id) }
                            } else {
                                feedback = "Пока неверно. Попробуй ещё раз — вопрос останется в списке."
                                scope.launch { repository.recordMistake(question.id) }
                            }
                        },
                    ) {
                        Text(option)
                    }
                }
            } else {
                if (revealed) {
                    InfoCard("Правильный ответ", question.correctAnswer)
                    OutlinedButton(
                        enabled = !answered,
                        onClick = {
                            answered = true
                            feedback = "Отмечено как повторённое."
                            scope.launch { repository.markMistakeCorrected(question.id) }
                        },
                    ) { Text("Я вспомнил ответ") }
                    OutlinedButton(
                        enabled = !answered,
                        onClick = {
                            answered = true
                            feedback = "Оставили для следующего повторения."
                        },
                    ) { Text("Нужно повторить позже") }
                } else {
                    Button(onClick = { revealed = true }) { Text("Показать ответ") }
                }
            }

            feedback?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            if (
                answered &&
                ((options.isNotEmpty() && feedback?.startsWith("Пока") == true) ||
                    (options.isEmpty() && feedback?.startsWith("Оставили") == true))
            ) {
                OutlinedButton(
                    onClick = {
                        answered = false
                        revealed = false
                        feedback = null
                    },
                ) { Text("Попробовать ещё раз") }
            }
            if (revealed || answered) {
                if (question.explanationPrompt != null) {
                    InfoCard("Что спрашивают", question.explanationPrompt.orEmpty())
                    InfoCard("Главная идея", question.explanationIdea.orEmpty())
                    InfoCard("Решение", question.explanationSolution.orEmpty())
                } else if (question.explanation.isNotBlank()) {
                    InfoCard("Пояснение", question.explanation)
                }
            }
        }
    }
}

@Composable
private fun ProfileScreen(profile: ProfileEntity) {
    val trackLabels = mapOf(
        "school_base" to "Школа · базовый уровень",
        "school_advanced" to "Школа · углублённый уровень",
        "college" to "Колледж",
        "technical_college" to "Техникум",
        "university" to "Университет",
    )
    val trackLevels = runCatching { JSONObject(profile.educationTrackLevels) }.getOrNull()
    val tracks = profile.educationTracks.split(",")
        .filter { it.isNotBlank() }
        .map { key ->
            val level = trackLevels?.optString(key).orEmpty()
            val label = trackLabels[key] ?: key
            val unit = if (key.startsWith("school_")) "класс" else "курс"
            if (level.isNotBlank()) "$label · $level $unit" else label
        }

    ScreenTitle("Профиль", "Твои образовательные направления и настройки.")
    InfoCard("Имя в PHYSICS", profile.nickname)
    InfoCard("Образовательные направления", tracks.joinToString("\n").ifBlank { "Не выбраны" })
    InfoCard("Локальные данные", "Профиль хранится в базе Room на этом устройстве. Интернет для работы не обязателен.")
}

@Composable
private fun ProfileSetupScreen(
    onSave: suspend (String, Set<String>, Map<String, String>) -> Unit,
) {
    var nickname by rememberSaveable { mutableStateOf("") }
    var selectedTracks by remember { mutableStateOf(setOf<String>()) }
    var trackLevels by remember { mutableStateOf(mapOf<String, String>()) }
    var saving by rememberSaveable { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val tracks = listOf(
        "school_base" to "Школа · базовый уровень",
        "school_advanced" to "Школа · углублённый уровень",
        "college" to "Колледж",
        "technical_college" to "Техникум",
        "university" to "Университет",
    )

    fun optionsFor(track: String): List<String> =
        if (track.startsWith("school_")) (7..11).map(Int::toString)
        else (1..6).map(Int::toString)

    val horizontalPadding = if (LocalConfiguration.current.screenWidthDp < 360) 16.dp else 24.dp
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontalPadding),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.Start,
    ) {
        Text("PHYSICS", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
        Text("Начнём знакомство", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Как к тебе обращаться в приложении?")
        OutlinedTextField(
            value = nickname,
            onValueChange = { nickname = it.take(32) },
            label = { Text("Имя или псевдоним") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        Text("Выбери образовательные направления", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Text(
            "Можно выбрать несколько. Для каждого направления укажи свой класс или курс.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        tracks.forEach { (key, label) ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = key in selectedTracks,
                    onCheckedChange = { checked ->
                        selectedTracks = if (checked) selectedTracks + key else selectedTracks - key
                        trackLevels = if (checked) {
                            trackLevels + (key to optionsFor(key).first())
                        } else {
                            trackLevels - key
                        }
                    },
                )
                Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
            }
        }

        tracks.filter { it.first in selectedTracks }.forEach { (key, label) ->
            Text(
                if (key.startsWith("school_")) "$label · класс" else "$label · курс",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                optionsFor(key).forEach { option ->
                    FilterChip(
                        selected = trackLevels[key] == option,
                        onClick = { trackLevels = trackLevels + (key to option) },
                        label = { Text(option) },
                    )
                }
            }
        }

        Button(
            enabled = !saving && selectedTracks.isNotEmpty(),
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                saving = true
                scope.launch {
                    onSave(nickname, selectedTracks, trackLevels.filterKeys { it in selectedTracks })
                    saving = false
                }
            },
        ) {
            Text(if (saving) "Сохраняем..." else "Продолжить")
        }
        Text(
            "Профиль и выбор программ сохраняются на устройстве. Интернет для начала работы не нужен.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
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

@Composable
private fun MetricCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun PhysicsTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) {
        darkColorScheme(
            primary = Color(0xFFB29AFF),
            onPrimary = Color(0xFF10233E),
            secondary = Color(0xFFC7B7FF),
            tertiary = Color(0xFF65C7BE),
            background = Color(0xFF171126),
            surface = Color(0xFF241B38),
            surfaceVariant = Color(0xFF33274E),
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF7655D9),
            onPrimary = Color.White,
            secondary = Color(0xFF9B80E8),
            tertiary = Color(0xFF259A9A),
            background = Color(0xFFF8F5FF),
            surface = Color.White,
            surfaceVariant = Color(0xFFF0EAFF),
        )
    }
    MaterialTheme(colorScheme = colors, content = content)
}
