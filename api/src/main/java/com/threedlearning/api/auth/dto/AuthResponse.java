package com.threedlearning.api.auth.dto;

import com.threedlearning.api.user.AppUser;
import com.threedlearning.api.user.UserRole;
import java.util.UUID;

public record AuthResponse(
        String token,
        UUID userId,
        String username,
        String displayName,
        UserRole role
) {

    public static AuthResponse from(String token, AppUser user) {
        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole()
        );
    }
}
