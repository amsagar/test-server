package dev.danvega.codingagent.chat.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatSession {
    private String id;
    private String title;
    private boolean archived;
    private String assistantId;
    private String styleId;
    private Long createdAt;
    private Long updatedAt;
}
