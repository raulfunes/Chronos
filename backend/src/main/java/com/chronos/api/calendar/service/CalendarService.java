package com.chronos.api.calendar.service;

import com.chronos.api.calendar.dto.CalendarEntryResponse;
import com.chronos.api.session.repository.FocusSessionRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CalendarService {

    private final FocusSessionRepository focusSessionRepository;

    public CalendarService(FocusSessionRepository focusSessionRepository) {
        this.focusSessionRepository = focusSessionRepository;
    }

    @Transactional(readOnly = true)
    public List<CalendarEntryResponse> getEntries(Long userId, Instant from, Instant to) {
        Instant start = from == null ? Instant.now().minus(14, ChronoUnit.DAYS) : from;
        Instant end = to == null ? Instant.now().plus(14, ChronoUnit.DAYS) : to;
        return focusSessionRepository.findAllByUserIdAndScheduledForBetweenOrderByScheduledForAsc(userId, start, end).stream()
            .map(session -> new CalendarEntryResponse(
                session.getId(),
                session.getGoal() == null ? null : session.getGoal().getId(),
                session.getGoal() == null ? null : session.getGoal().getTitle(),
                session.getTask() == null ? null : session.getTask().getId(),
                session.getTask() == null ? null : session.getTask().getTitle(),
                session.getType(),
                session.getStatus(),
                session.getDurationMinutes(),
                session.getScheduledFor()
            ))
            .toList();
    }
}
