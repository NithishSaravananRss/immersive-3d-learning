package com.threedlearning.api.progress.dto;

import com.threedlearning.api.progress.UserProgress;
import java.time.Instant;
import java.util.UUID;

public record UserProgressResponse(
        UUID id,
        UUID nodeId,
        boolean completed,
        int masteryScore,
        Instant lastVisitedAt
) {

    public static UserProgressResponse from(UserProgress progress) {
        return new UserProgressResponse(
                progress.getId(),
                progress.getNode().getId(),
                progress.isCompleted(),
                progress.getMasteryScore(),
                progress.getLastVisitedAt()
        );
    }
}
