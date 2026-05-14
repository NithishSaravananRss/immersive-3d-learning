package com.threedlearning.api.node;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NodeRelationshipRepository extends JpaRepository<NodeRelationship, UUID> {

    List<NodeRelationship> findAllBySourceNodeId(UUID sourceNodeId);
}
