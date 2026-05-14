package com.threedlearning.api.progress;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProgressRepository extends JpaRepository<UserProgress, UUID> {

    List<UserProgress> findAllByUserId(UUID userId);

    Optional<UserProgress> findByUserIdAndNodeId(UUID userId, UUID nodeId);
}
