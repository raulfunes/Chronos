package com.chronos.api.analytics.service;

import com.chronos.api.analytics.dto.AnalyticsSummaryResponse;
import com.chronos.api.goal.model.GoalStatus;
import com.chronos.api.goal.repository.GoalRepository;
import com.chronos.api.goal.service.GoalService;
import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.repository.FocusSessionRepository;
import com.chronos.api.task.model.TaskStatus;
import com.chronos.api.task.repository.TaskRepository;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {

    private final GoalRepository goalRepository;
    private final TaskRepository taskRepository;
    private final FocusSessionRepository focusSessionRepository;
    private final GoalService goalService;

    public AnalyticsService(
        GoalRepository goalRepository,
        TaskRepository taskRepository,
        FocusSessionRepository focusSessionRepository,
        GoalService goalService
    ) {
        this.goalRepository = goalRepository;
        this.taskRepository = taskRepository;
        this.focusSessionRepository = focusSessionRepository;
        this.goalService = goalService;
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryResponse summary(Long userId) {
        var goals = goalRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        long activeGoals = goals.stream().filter(goal -> goal.getStatus() != GoalStatus.DONE).count();
        long completedTasks = taskRepository.countByUserIdAndStatus(userId, TaskStatus.DONE);
        var sessions = focusSessionRepository.findAllByUserIdOrderByScheduledForAscCreatedAtAsc(userId);
        long completedSessions = sessions.stream().filter(session -> session.getStatus() == SessionStatus.COMPLETED).count();
        long focusMinutes = sessions.stream()
            .filter(session -> session.getStatus() == SessionStatus.COMPLETED)
            .mapToLong(session -> session.getDurationMinutes().longValue())
            .sum();
        long currentStreak = calculateStreak(sessions);

        List<AnalyticsSummaryResponse.GoalProgressItem> goalProgress = goals.stream()
            .map(goalService::toResponse)
            .map(goal -> new AnalyticsSummaryResponse.GoalProgressItem(goal.id(), goal.title(), goal.progress()))
            .sorted(Comparator.comparingInt(AnalyticsSummaryResponse.GoalProgressItem::progress).reversed())
            .toList();

        return new AnalyticsSummaryResponse(activeGoals, completedTasks, completedSessions, focusMinutes, currentStreak, goalProgress);
    }

    private long calculateStreak(List<com.chronos.api.session.model.FocusSession> sessions) {
        List<LocalDate> completionDays = sessions.stream()
            .filter(session -> session.getCompletedAt() != null)
            .map(session -> LocalDate.ofInstant(session.getCompletedAt(), ZoneOffset.UTC))
            .distinct()
            .sorted(Comparator.reverseOrder())
            .toList();
        if (completionDays.isEmpty()) {
            return 0;
        }

        LocalDate expected = LocalDate.now(ZoneOffset.UTC);
        long streak = 0;
        for (LocalDate day : completionDays) {
            if (day.equals(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else if (day.equals(expected.plusDays(1))) {
                continue;
            } else {
                break;
            }
        }
        return streak;
    }
}
