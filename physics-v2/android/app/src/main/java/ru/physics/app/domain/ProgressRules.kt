package ru.physics.app.domain

data class ProgressSnapshot(
    val contentType: String,
    val contentId: String,
    val status: String,
    val completionPercent: Int,
    val bestScore: Int?,
    val bestGrade: Int?,
    val latestGrade: Int?,
)

fun mergeProgress(
    existing: ProgressSnapshot?,
    incoming: ProgressSnapshot,
): ProgressSnapshot {
    require(incoming.completionPercent in 0..100) {
        "Completion must be between 0 and 100."
    }
    require(incoming.status in setOf("not_started", "in_progress", "mastered")) {
        "Unknown progress status."
    }

    if (existing == null) {
        return incoming.copy(
            completionPercent = if (incoming.status == "mastered") 100 else incoming.completionPercent,
        )
    }

    require(existing.contentType == incoming.contentType && existing.contentId == incoming.contentId) {
        "Progress records must refer to the same content item."
    }

    val rank = mapOf("not_started" to 0, "in_progress" to 1, "mastered" to 2)
    val status = if (rank.getValue(existing.status) > rank.getValue(incoming.status)) {
        existing.status
    } else {
        incoming.status
    }

    return incoming.copy(
        status = status,
        completionPercent = if (status == "mastered") {
            100
        } else {
            maxOf(existing.completionPercent, incoming.completionPercent)
        },
        bestScore = listOfNotNull(existing.bestScore, incoming.bestScore).maxOrNull(),
        bestGrade = listOfNotNull(existing.bestGrade, incoming.bestGrade).maxOrNull(),
        latestGrade = incoming.latestGrade ?: existing.latestGrade,
    )
}
