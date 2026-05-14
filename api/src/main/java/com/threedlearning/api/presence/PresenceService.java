package com.threedlearning.api.presence;

import com.threedlearning.api.user.AppUser;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class PresenceService {

    private final Map<String, PresenceState> activeSessions = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate messagingTemplate;

    public PresenceService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void updatePresence(String sessionId, AppUser user, PresenceUpdateMessage update) {
        PresenceState state = new PresenceState(
                sessionId,
                user.getId().toString(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole().name(),
                update.x(),
                update.y(),
                update.z(),
                update.yaw(),
                update.speed()
        );

        activeSessions.put(sessionId, state);
        publishSnapshot();
    }

    public void removePresence(String sessionId) {
        if (activeSessions.remove(sessionId) != null) {
            publishSnapshot();
        }
    }

    public List<PresenceState> snapshot() {
        return activeSessions.values().stream().toList();
    }

    public void publishSnapshot() {
        messagingTemplate.convertAndSend("/topic/presence", snapshot());
    }
}
