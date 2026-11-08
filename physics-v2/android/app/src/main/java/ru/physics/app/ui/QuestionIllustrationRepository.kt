package ru.physics.app.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream

class QuestionIllustrationRepository(
    private val context: Context,
) {
    private val cacheDirectory = File(context.filesDir, "question-illustrations").apply {
        mkdirs()
    }

    suspend fun load(fileName: String): Bitmap? = withContext(Dispatchers.IO) {
        if (!FILE_NAME.matches(fileName)) return@withContext null

        val cachedFile = File(cacheDirectory, fileName)
        if (cachedFile.isFile) {
            BitmapFactory.decodeFile(cachedFile.absolutePath)?.let { return@withContext it }
            cachedFile.delete()
        }

        loadBundledIllustration(fileName)?.let { return@withContext it }

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

    private fun loadBundledIllustration(fileName: String): Bitmap? {
        return runCatching {
            ZipInputStream(context.assets.open(BUNDLED_ARCHIVE)).use { archive ->
                var entry = archive.nextEntry
                while (entry != null) {
                    if (!entry.isDirectory && entry.name == fileName) {
                        val bytes = archive.readBytes()
                        val cachedFile = File(cacheDirectory, fileName)
                        cachedFile.writeBytes(bytes)
                        return@runCatching BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    }
                    archive.closeEntry()
                    entry = archive.nextEntry
                }
                null
            }
        }.getOrNull()
    }

    private companion object {
        const val BUNDLED_ARCHIVE = "question-illustrations.zip"
        val FILE_NAME = Regex("^[A-Za-z0-9_.-]{1,80}$")
        val MIRRORS = listOf(
            "https://fizika.gitverse.site/pics/",
            "https://vitalya2078-cloud.github.io/fizika/pics/",
        )
    }
}
