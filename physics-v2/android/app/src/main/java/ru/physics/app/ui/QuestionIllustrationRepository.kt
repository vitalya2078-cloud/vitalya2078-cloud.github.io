package ru.physics.app.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

class QuestionIllustrationRepository(
    context: Context,
) {
    private val cacheDirectory = File(context.cacheDir, "question-illustrations").apply {
        mkdirs()
    }

    suspend fun load(fileName: String): Bitmap? = withContext(Dispatchers.IO) {
        if (!FILE_NAME.matches(fileName)) return@withContext null

        val cachedFile = File(cacheDirectory, fileName)
        if (cachedFile.isFile) {
            BitmapFactory.decodeFile(cachedFile.absolutePath)?.let { return@withContext it }
            cachedFile.delete()
        }

        for (baseUrl in MIRRORS) {
            val connection = runCatching {
                URL(baseUrl + fileName).openConnection() as HttpURLConnection
            }.getOrNull() ?: continue

            try {
                connection.connectTimeout = 6_000
                connection.readTimeout = 8_000
                connection.instanceFollowRedirects = true

                if (connection.responseCode !in 200..299) continue
                val bytes = connection.inputStream.use { it.readBytes() }
                val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: continue
                cachedFile.writeBytes(bytes)
                return@withContext bitmap
            } catch (_: Exception) {
                // Try the next trusted mirror. A missing image must not stop the test.
            } finally {
                connection.disconnect()
            }
        }

        null
    }

    private companion object {
        val FILE_NAME = Regex("^[A-Za-z0-9_.-]{1,80}$")
        val MIRRORS = listOf(
            "https://fizika.gitverse.site/pics/",
            "https://vitalya2078-cloud.github.io/fizika/pics/",
        )
    }
}
