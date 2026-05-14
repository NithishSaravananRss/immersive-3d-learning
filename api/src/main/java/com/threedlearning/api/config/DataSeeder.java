package com.threedlearning.api.config;

import com.threedlearning.api.node.LearningNode;
import com.threedlearning.api.node.LearningNodeRepository;
import com.threedlearning.api.node.NodeCategory;
import com.threedlearning.api.node.NodeRelationship;
import com.threedlearning.api.node.NodeRelationshipRepository;
import com.threedlearning.api.user.AppUser;
import com.threedlearning.api.user.UserRepository;
import com.threedlearning.api.user.UserRole;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final LearningNodeRepository learningNodeRepository;
    private final NodeRelationshipRepository nodeRelationshipRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public DataSeeder(
            LearningNodeRepository learningNodeRepository,
            NodeRelationshipRepository nodeRelationshipRepository,
            PasswordEncoder passwordEncoder,
            UserRepository userRepository
    ) {
        this.learningNodeRepository = learningNodeRepository;
        this.nodeRelationshipRepository = nodeRelationshipRepository;
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        seedUsers();
        seedNodes();
    }

    private void seedUsers() {
        if (!userRepository.existsByUsernameIgnoreCase("admin")) {
            AppUser admin = new AppUser();
            admin.setUsername("admin");
            admin.setEmail("admin@3dlearning.local");
            admin.setDisplayName("World Admin");
            admin.setPassword(passwordEncoder.encode("ChangeMeNow123!"));
            admin.setRole(UserRole.ADMIN);
            userRepository.save(admin);
        }

        if (!userRepository.existsByUsernameIgnoreCase("student")) {
            AppUser student = new AppUser();
            student.setUsername("student");
            student.setEmail("student@3dlearning.local");
            student.setDisplayName("Demo Student");
            student.setPassword(passwordEncoder.encode("ChangeMeNow123!"));
            student.setRole(UserRole.STUDENT);
            userRepository.save(student);
        }
    }

    private void seedNodes() {
        LearningNode dataStructures = createOrUpdateNode(
                "ds-foundations",
                NodeCategory.DATA_STRUCTURES,
                "Data Structures Wing",
                "Map how data is shaped in memory before we optimize the operations on top of it.",
                "Approach this node to review arrays, linked lists, stacks, queues, and tree intuition.",
                "#61d9ff",
                -12.0,
                1.4,
                -10.0,
                List.of(
                        "Arrays trade insertion flexibility for fast indexed access.",
                        "Linked lists shine when pointer rewiring is cheaper than shifting memory.",
                        "Stacks and queues model control flow, buffering, and scheduling patterns."
                )
        );

        LearningNode algorithms = createOrUpdateNode(
                "algo-core",
                NodeCategory.ALGORITHMS,
                "Algorithms Core",
                "Turn structure knowledge into time and space decisions that scale cleanly.",
                "This node is staged for sorting, search, recursion, and complexity walkthroughs.",
                "#8e7dff",
                10.0,
                1.7,
                -4.0,
                List.of(
                        "Big-O gives the growth story, not the full runtime story.",
                        "Divide-and-conquer wins when subproblems stay independent.",
                        "Greedy choices work only when local decisions preserve the global optimum."
                )
        );

        LearningNode systems = createOrUpdateNode(
                "systems-sector",
                NodeCategory.OPERATING_SYSTEMS,
                "Systems Sector",
                "Connect process scheduling, memory, and concurrency to the machine underneath the app.",
                "Use this zone for CPU scheduling, synchronization, deadlocks, and virtual memory.",
                "#3cffb3",
                0.0,
                1.5,
                -18.0,
                List.of(
                        "A process owns resources; a thread is the execution path inside it.",
                        "Schedulers balance fairness, latency, and throughput under load.",
                        "Virtual memory keeps programs isolated while making physical memory reusable."
                )
        );

        if (nodeRelationshipRepository.count() == 0) {
            nodeRelationshipRepository.save(createRelationship(dataStructures, algorithms, "UNLOCKS"));
            nodeRelationshipRepository.save(createRelationship(algorithms, systems, "UNLOCKS"));
            nodeRelationshipRepository.save(createRelationship(systems, dataStructures, "REINFORCES"));
        }
    }

    private LearningNode createOrUpdateNode(
            String slug,
            NodeCategory category,
            String title,
            String summary,
            String prompt,
            String color,
            double x,
            double y,
            double z,
            List<String> details
    ) {
        LearningNode node = learningNodeRepository.findBySlug(slug).orElseGet(LearningNode::new);
        node.setSlug(slug);
        node.setCategory(category);
        node.setTitle(title);
        node.setSummary(summary);
        node.setPrompt(prompt);
        node.setColor(color);
        node.setPositionX(x);
        node.setPositionY(y);
        node.setPositionZ(z);
        node.setPublished(true);
        node.setDetails(details);
        return learningNodeRepository.save(node);
    }

    private NodeRelationship createRelationship(LearningNode source, LearningNode target, String type) {
        NodeRelationship relationship = new NodeRelationship();
        relationship.setSourceNode(source);
        relationship.setTargetNode(target);
        relationship.setRelationshipType(type);
        return relationship;
    }
}
