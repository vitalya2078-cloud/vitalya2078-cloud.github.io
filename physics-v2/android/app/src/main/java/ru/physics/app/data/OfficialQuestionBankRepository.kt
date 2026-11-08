package ru.physics.app.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

data class OfficialQuestion(
    val id: String,
    val topicId: Int,
    val topicCode: String,
    val topicTitle: String,
    val sourceNumber: Int,
    val text: String,
    val correctAnswer: String,
    val wrongOptions: List<String>,
    val illustrationRef: String?,
    val explanation: String,
    val explanationPrompt: String?,
    val explanationIdea: String?,
    val explanationSolution: String?,
)

data class OfficialQuestionBank(
    val questions: List<OfficialQuestion>,
    val topicCounts: Map<String, Int>,
) {
    fun questionsForTopic(topicCode: String?): List<OfficialQuestion> =
        if (topicCode == null) questions else questions.filter { it.topicCode == topicCode }

    fun topicNames(): List<Pair<String, String>> =
        questions.distinctBy { it.topicCode }.map { it.topicCode to it.topicTitle }
}

class OfficialQuestionBankRepository(
    private val context: Context,
) {
    @Volatile
    private var cachedBank: OfficialQuestionBank? = null

    suspend fun load(): OfficialQuestionBank = withContext(Dispatchers.IO) {
        cachedBank?.let { return@withContext it }

        val json = context.assets.open(ASSET_NAME).bufferedReader().use { it.readText() }
        val root = JSONObject(json)
        require(root.optBoolean("immutableSource")) {
            "The official question bank must be marked as an immutable source."
        }

        val expectedCount = root.optInt("expectedQuestionCount")
        val rows = root.optJSONArray("questions")
            ?: error("The official question bank has no questions array.")

        val questions = buildList(rows.length()) {
            for (index in 0 until rows.length()) {
                val row = rows.getJSONObject(index)
                val payload = row.getJSONObject("original_payload")
                val explanationValue = payload.opt("e")
                val explanationObject = explanationValue as? JSONObject
                val explanationText = explanationValue as? String ?: ""

                val options = payload.optJSONArray("x")
                val wrongOptions = buildList {
                    if (options != null) {
                        for (optionIndex in 0 until options.length()) {
                            add(options.getString(optionIndex))
                        }
                    }
                }

                add(
                    OfficialQuestion(
                        id = row.getString("id"),
                        topicId = row.getInt("legacy_topic_id"),
                        topicCode = row.getString("topic_code"),
                        topicTitle = row.getString("topic_title"),
                        sourceNumber = row.getInt("source_question_number"),
                        text = payload.optString("t", row.optString("original_text")),
                        correctAnswer = payload.getString("a"),
                        wrongOptions = wrongOptions,
                        illustrationRef = payload.optString("p").takeIf { it.isNotBlank() },
                        explanation = explanationText,
                        explanationPrompt = explanationObject?.optString("s"),
                        explanationIdea = explanationObject?.optString("i"),
                        explanationSolution = explanationObject?.optString("r"),
                    ),
                )
            }
        }

        require(questions.size == expectedCount && expectedCount == 900) {
            "Official bank integrity check failed: expected $expectedCount questions, found ${questions.size}."
        }
        require(questions.map { it.id }.distinct().size == questions.size) {
            "Official bank contains duplicate question identifiers."
        }

        val counts = questions.groupingBy { it.topicCode }.eachCount()
        require(counts.size == 9 && counts.values.all { it == 100 }) {
            "Official bank topic distribution is invalid."
        }

        OfficialQuestionBank(questions, counts).also { cachedBank = it }
    }

    private companion object {
        const val ASSET_NAME = "official-question-bank.json"
    }
}
