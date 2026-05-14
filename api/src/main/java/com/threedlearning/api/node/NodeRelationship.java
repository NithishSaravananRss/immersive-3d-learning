package com.threedlearning.api.node;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "node_relationships")
public class NodeRelationship {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_node_id", nullable = false)
    private LearningNode sourceNode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_node_id", nullable = false)
    private LearningNode targetNode;

    @Column(nullable = false, length = 40)
    private String relationshipType;

    public UUID getId() {
        return id;
    }

    public LearningNode getSourceNode() {
        return sourceNode;
    }

    public void setSourceNode(LearningNode sourceNode) {
        this.sourceNode = sourceNode;
    }

    public LearningNode getTargetNode() {
        return targetNode;
    }

    public void setTargetNode(LearningNode targetNode) {
        this.targetNode = targetNode;
    }

    public String getRelationshipType() {
        return relationshipType;
    }

    public void setRelationshipType(String relationshipType) {
        this.relationshipType = relationshipType;
    }
}
