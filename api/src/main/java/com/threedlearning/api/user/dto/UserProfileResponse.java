package com.threedlearning.api.user.dto;

import com.threedlearning.api.user.AppUser;
import com.threedlearning.api.user.EducationType;
import com.threedlearning.api.user.Gender;
import com.threedlearning.api.user.UserRole;
import java.time.Instant;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String username,
        String email,
        String displayName,
        UserRole role,
        EducationType educationType,
        Gender gender,
        Instant createdAt
) {

    public static UserProfileResponse from(AppUser user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getEducationType(),
                user.getGender(),
                user.getCreatedAt()
        );
    }
}
