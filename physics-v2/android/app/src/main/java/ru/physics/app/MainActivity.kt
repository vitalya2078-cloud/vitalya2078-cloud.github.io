package ru.physics.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import ru.physics.app.data.CatalogRepository
import ru.physics.app.data.CatalogSummary
import ru.physics.app.data.PhysicsDatabase
import ru.physics.app.data.PhysicsDao
import ru.physics.app.data.ProfileEntity
import ru.physics.app.domain.calculateFreeFall
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val database = PhysicsDatabase.getInstance(applicationContext)

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
                            onSave = { nickname ->
                                database.physicsDao().saveProfile(
                                    ProfileEntity(
                                        nickname = nickname.trim().ifBlank { "Исследователь" },
                                        birthYear = null,
                                        updatedAt = System.currentTimeMillis(),
                                    ),
                                )
                            },
                        )
                    } else {
                        NativeHome(
                            nickname = profile?.nickname.orEmpty(),
                            dao = database.physicsDao(),
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
private fun NativeHome(nickname: String, dao: PhysicsDao) {
    var selectedSection by rememberSaveable { mutableStateOf(AppSection.HOME) }
    val progressCount by dao.observeProgressCount().collectAsStateWithLifecycle(initialValue = 0)
    val attemptCount by dao.observeAttemptCount().collectAsStateWithLifecycle(initialValue = 0)
    val mistakeCount by dao.observeOpenMistakeCount().collectAsStateWithLifecycle(initialValue = 0)

    androidx.compose.material3.Scaffold(
        bottomBar = {
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
                        icon = { androidx.compose.material3.Icon(icon, contentDescription = null) },
                        label = { Text(section.label) },
                    )
                }
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 18.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            when (selectedSection) {
                AppSection.HOME -> HomeScreen(nickname, onOpen = { selectedSection = it })
                AppSection.LEARNING -> LearningScreen(dao)
                AppSection.TESTING -> TestingScreen()
                AppSection.LAB -> LaboratoryScreen()
                AppSection.PROGRESS -> ProgressScreen(progressCount, attemptCount, mistakeCount)
                AppSection.PROFILE -> ProfileScreen(nickname)
            }
        }
    }
}

@Composable
private fun HomeScreen(nickname: String, onOpen: (AppSection) -> Unit) {
    Text("PHYSICS", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
    Text("Привет, $nickname!", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
    Text(
        "Твоя личная среда для изучения физики. Учись в своём темпе — даже без интернета.",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Исследуй физику", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Теория, задачи и эксперименты — в одном приложении.")
            Button(onClick = { onOpen(AppSection.LEARNING) }) {
                Text("Перейти к обучению")
            }
        }
    }
    Text("Разделы PHYSICS", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
    SectionCard("Обучение", "Темы, уроки и учебные материалы", Icons.Default.MenuBook) { onOpen(AppSection.LEARNING) }
    SectionCard("Тестирование", "Проверка знаний и разбор ответов", Icons.Default.Quiz) { onOpen(AppSection.TESTING) }
    SectionCard("Лаборатория", "Интерактивные физические модели", Icons.Default.Science) { onOpen(AppSection.LAB) }
    SectionCard("Мой прогресс", "Результаты, ошибки и достижения", Icons.Default.Timeline) { onOpen(AppSection.PROGRESS) }
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
private fun TestingScreen() {
    ScreenTitle("Тестирование", "Здесь будут тренировочные задания, контрольные тесты и экзаменационные режимы.")
    InfoCard("Официальный банк", "В базе сохранены 900 утверждённых вопросов. Подключение безопасной выдачи вопросов и сохранения попыток ещё выполняется.")
    InfoCard("Режимы", "Тренировка — без оценки и ограничений. Итоговый тест — с оценкой и сохранением каждой попытки. Ошибки можно будет повторять отдельно.")
}

@Composable
private fun LaboratoryScreen() {
    var height by rememberSaveable { mutableFloatStateOf(20f) }
    val result = calculateFreeFall(height.toDouble())
    ScreenTitle("Лаборатория", "Свободное падение без начальной скорости")
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Высота", style = MaterialTheme.typography.titleMedium)
            Text(height.toInt().toString() + " м", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.primary)
            Slider(value = height, onValueChange = { height = it }, valueRange = 1f..100f)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("1 м", style = MaterialTheme.typography.labelSmall)
                Text("100 м", style = MaterialTheme.typography.labelSmall)
            }
            InfoCard("Время падения", String.format(Locale.getDefault(), "%.2f с", result.timeSeconds))
            InfoCard("Скорость перед касанием земли", String.format(Locale.getDefault(), "%.2f м/с", result.finalVelocityMetersPerSecond))
            Text("Модель: сопротивлением воздуха пренебрегаем, g = 9,81 м/с².", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ProgressScreen(progressCount: Int, attemptCount: Int, mistakeCount: Int) {
    ScreenTitle("Мой прогресс", "Статистика хранится на устройстве и не пропадёт при отсутствии интернета.")
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        MetricCard("Темы", progressCount.toString(), Modifier.weight(1f))
        MetricCard("Попытки", attemptCount.toString(), Modifier.weight(1f))
    }
    MetricCard("Неразобранные ошибки", mistakeCount.toString(), Modifier.fillMaxWidth())
    InfoCard("Синхронизация", "Локальное хранилище работает независимо от сети. Облачная синхронизация включится после внедрения авторизации и проверки прав доступа.")
}

@Composable
private fun ProfileScreen(nickname: String) {
    ScreenTitle("Профиль", "Твой профиль и настройки обучения.")
    InfoCard("Имя в PHYSICS", nickname)
    InfoCard("Данные", "Профиль хранится локально. В дальнейшем можно будет подключить учётную запись и синхронизацию между устройствами.")
}

@Composable
private fun ProfileSetupScreen(onSave: suspend (String) -> Unit) {
    var nickname by rememberSaveable { mutableStateOf("") }
    var saving by rememberSaveable { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.Start,
    ) {
        Text("PHYSICS", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
        Spacer(Modifier.height(12.dp))
        Text("Начнём знакомство", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text("Как к тебе обращаться в приложении?", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(20.dp))
        OutlinedTextField(
            value = nickname,
            onValueChange = { nickname = it.take(32) },
            label = { Text("Имя или псевдоним") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Button(
            enabled = !saving,
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                saving = true
                scope.launch {
                    onSave(nickname)
                    saving = false
                }
            },
        ) {
            Text(if (saving) "Сохраняем..." else "Продолжить")
        }
        Spacer(Modifier.height(10.dp))
        Text(
            "Данные сохраняются на этом устройстве. Интернет для начала работы не нужен.",
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
    val colors = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()
    MaterialTheme(colorScheme = colors, content = content)
}
