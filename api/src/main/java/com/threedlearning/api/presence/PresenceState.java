package com.threedlearning.api.presence;

public record PresenceState(
        String sessionId,
        String userId,
        String username,
        String displayName,
        String role,
        double x,
        double y,
        double z,
        double yaw,
        double speed
) {
}
