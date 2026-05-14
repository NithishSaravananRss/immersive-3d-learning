package com.threedlearning.api.node;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningNodeRepository extends JpaRepository<LearningNode, UUID> {

    Optional<LearningNode> findBySlug(String slug);

    List<LearningNode> findAllByOrderByTitleAsc();
}
