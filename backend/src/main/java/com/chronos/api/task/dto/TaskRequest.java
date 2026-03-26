package com.chronos.api.task.dto;

import com.chronos.api.task.model.TaskStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record TaskRequest(
    Long goalId,
    @NotBlank String title,
    String description,
    TaskStatus status,
    @Min(1) Integer estimatedSessions,
    LocalDate dueDate
) {
}
