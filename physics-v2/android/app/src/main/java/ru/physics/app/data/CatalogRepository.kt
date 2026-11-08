package ru.physics.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class CatalogSummary(
    val programCount: Int,
    val topicCount: Int,
    val lessonCount: Int,
    val fromCache: Boolean,
    val cachedAt: Long,
)

class CatalogRepository(
    private val dao: PhysicsDao,
) {
    suspend fun loadPublishedCatalog(): CatalogSummary = withContext(Dispatchers.IO) {
        try {
            val connection = URL(API_URL).openConnection() as HttpURLConnection
            val responseBody = try {
                connection.requestMethod = "GET"
                connection.connectTimeout = 8_000
                connection.readTimeout = 12_000
                connection.setRequestProperty("Accept", "application/json")

                val status = connection.responseCode
                val stream = if (status in 200..299) {
                    connection.inputStream
                } else {
                    connection.errorStream
                }
                val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
                check(status in 200..299) { "Сервер каталога ответил: HTTP $status" }
                body
            } finally {
                connection.disconnect()
            }

            val root = JSONObject(responseBody)
            val data = root.optJSONArray("data") ?: JSONArray()
            val summary = parseSummary(data, fromCache = false, cachedAt = System.currentTimeMillis())
            dao.saveCatalogCache(
                CatalogCacheEntity(
                    payload = responseBody,
                    cachedAt = System.currentTimeMillis(),
                ),
            )
            summary
        } catch (networkError: Exception) {
            val cached = dao.getCatalogCache() ?: throw networkError
            val root = JSONObject(cached.payload)
            val data = root.optJSONArray("data") ?: JSONArray()
            parseSummary(data, fromCache = true, cachedAt = cached.cachedAt)
        }
    }

    private fun parseSummary(
        programs: JSONArray,
        fromCache: Boolean,
        cachedAt: Long,
    ): CatalogSummary {
        var topics = 0
        var lessons = 0

        for (programIndex in 0 until programs.length()) {
            val versions = programs.optJSONObject(programIndex)?.optJSONArray("versions") ?: continue
            for (versionIndex in 0 until versions.length()) {
                val levels = versions.optJSONObject(versionIndex)?.optJSONArray("levels") ?: continue
                for (levelIndex in 0 until levels.length()) {
                    val sections = levels.optJSONObject(levelIndex)?.optJSONArray("sections") ?: continue
                    for (sectionIndex in 0 until sections.length()) {
                        val section = sections.optJSONObject(sectionIndex) ?: continue
                        val sectionTopics = section.optJSONArray("topics") ?: continue
                        topics += sectionTopics.length()
                        for (topicIndex in 0 until sectionTopics.length()) {
                            lessons += sectionTopics.optJSONObject(topicIndex)
                                ?.optJSONArray("lessons")?.length() ?: 0
                        }
                    }
                }
            }
        }

        return CatalogSummary(
            programCount = programs.length(),
            topicCount = topics,
            lessonCount = lessons,
            fromCache = fromCache,
            cachedAt = cachedAt,
        )
    }

    private companion object {
        const val API_URL =
            "https://vqiljksvsdjmwbbngimg.supabase.co/functions/v1/physics-api/v1/catalog"
    }
}
