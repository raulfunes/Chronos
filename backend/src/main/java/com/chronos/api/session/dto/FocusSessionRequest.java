package com.chronos.api.session.dto;

import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.model.SessionType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record FocusSessionRequest(
    Long goalId,
    Long taskId,
    @NotNull SessionType type,
    SessionStatus status,
    @Min(1) Integer durationMinutes,
    Instant scheduledFor
) {
}
