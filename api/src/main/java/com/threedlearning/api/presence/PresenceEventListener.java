package com.threedlearning.api.presence;

import com.threedlearning.api.user.AppUser;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class PresenceEventListener {

    private final PresenceService presenceService;

    public PresenceEventListener(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Authentication authentication = (Authentication) accessor.getUser();
        String sessionId = accessor.getSessionId();

        if (authentication == null || sessionId == null) {
            return;
        }

        if (authentication.getPrincipal() instanceof AppUser user) {
            presenceService.updatePresence(
                    sessionId,
                    user,
                    new PresenceUpdateMessage(0.0, 1.25, 12.0, Math.PI, 0.0)
            );
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        presenceService.removePresence(event.getSessionId());
    }
}
