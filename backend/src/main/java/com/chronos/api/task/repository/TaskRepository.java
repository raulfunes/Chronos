package com.chronos.api.task.repository;

import com.chronos.api.task.model.TaskItem;
import com.chronos.api.task.model.TaskStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<TaskItem, Long> {
    List<TaskItem> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndStatus(Long userId, TaskStatus status);
}
