package com.chronos.api.task.repository;

import com.chronos.api.task.model.TaskItem;
import com.chronos.api.task.model.TaskStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<TaskItem, Long> {
    List<TaskItem> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndStatus(Long userId, TaskStatus status);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        update TaskItem task
        set task.goal = null
        where task.user.id = :userId and task.goal is not null and task.goal.id = :goalId
        """)
    int clearGoalReferences(@Param("userId") Long userId, @Param("goalId") Long goalId);
}
