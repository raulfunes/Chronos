package com.chronos.api.goal.dto;

import com.chronos.api.goal.model.GoalPriority;
import com.chronos.api.goal.model.GoalStatus;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record GoalRequest(
    @NotBlank String title,
    String description,
    GoalStatus status,
    GoalPriority priority,
    LocalDate targetDate
) {
}
