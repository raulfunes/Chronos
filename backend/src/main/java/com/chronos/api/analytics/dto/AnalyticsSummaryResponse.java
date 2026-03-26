package com.chronos.api.analytics.dto;

import java.util.List;

public record AnalyticsSummaryResponse(
    long activeGoals,
    long completedTasks,
    long completedSessions,
    long focusMinutes,
    long currentStreak,
    List<GoalProgressItem> goalProgress
) {
    public record GoalProgressItem(Long goalId, String title, int progress) {
    }
}
