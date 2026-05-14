package com.threedlearning.api.presence;

public record PresenceUpdateMessage(
        double x,
        double y,
        double z,
        double yaw,
        double speed
) {
}
