package com.chronos.api.calendar.dto;

import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.model.SessionType;
import java.time.Instant;

public record CalendarEntryResponse(
    Long sessionId,
    Long goalId,
    String goalTitle,
    Long taskId,
    String taskTitle,
    SessionType type,
    SessionStatus status,
    Integer durationMinutes,
    Instant scheduledFor
) {
}
