package com.threedlearning.api.presence;

import com.threedlearning.api.user.AppUser;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
public class PresenceController {

    private final PresenceService presenceService;

    public PresenceController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @MessageMapping("/presence.update")
    public void updatePresence(PresenceUpdateMessage message, SimpMessageHeaderAccessor accessor) {
        Authentication authentication = (Authentication) accessor.getUser();

        if (authentication == null || !(authentication.getPrincipal() instanceof AppUser user)) {
            return;
        }

        String sessionId = accessor.getSessionId();

        if (sessionId == null) {
            return;
        }

        presenceService.updatePresence(sessionId, user, message);
    }
}
