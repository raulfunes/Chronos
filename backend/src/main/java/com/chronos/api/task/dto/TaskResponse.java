package com.chronos.api.task.dto;

import com.chronos.api.task.model.TaskStatus;
import java.time.Instant;
import java.time.LocalDate;

public record TaskResponse(
    Long id,
    Long goalId,
    String goalTitle,
    String title,
    String description,
    TaskStatus status,
    Integer estimatedSessions,
    LocalDate dueDate,
    Instant createdAt
) {
}
