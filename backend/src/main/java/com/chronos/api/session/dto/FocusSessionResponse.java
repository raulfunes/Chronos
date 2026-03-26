package com.chronos.api.session.dto;

import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.model.SessionType;
import java.time.Instant;

public record FocusSessionResponse(
    Long id,
    Long goalId,
    String goalTitle,
    Long taskId,
    String taskTitle,
    SessionType type,
    SessionStatus status,
    Integer durationMinutes,
    Integer remainingSeconds,
    Instant scheduledFor,
    Instant startedAt,
    Instant lastResumedAt,
    Instant completedAt,
    Instant createdAt
) {
}
