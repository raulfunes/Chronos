package com.chronos.api.goal.dto;

import com.chronos.api.goal.model.GoalPriority;
import com.chronos.api.goal.model.GoalStatus;
import java.time.Instant;
import java.time.LocalDate;

public record GoalResponse(
    Long id,
    String title,
    String description,
    GoalStatus status,
    GoalPriority priority,
    LocalDate targetDate,
    int progress,
    long taskCount,
    long completedTaskCount,
    long totalSessions,
    long completedSessions,
    Instant createdAt
) {
}
