package com.threedlearning.api.node.dto;

import com.threedlearning.api.node.LearningNode;
import com.threedlearning.api.node.NodeCategory;
import java.util.List;
import java.util.UUID;

public record LearningNodeResponse(
        UUID id,
        String slug,
        NodeCategory category,
        String title,
        String summary,
        String prompt,
        String color,
        boolean published,
        NodePositionRequest position,
        List<String> details,
        List<UUID> relatedNodeIds
) {

    public static LearningNodeResponse from(LearningNode node, List<UUID> relatedNodeIds) {
        return new LearningNodeResponse(
                node.getId(),
                node.getSlug(),
                node.getCategory(),
                node.getTitle(),
                node.getSummary(),
                node.getPrompt(),
                node.getColor(),
                node.isPublished(),
                new NodePositionRequest(node.getPositionX(), node.getPositionY(), node.getPositionZ()),
                List.copyOf(node.getDetails()),
                relatedNodeIds
        );
    }
}
