package com.ai.email.writer.app;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;


import java.util.Map;

@Service
public class EmailGeneratorService {

    private final WebClient webClient;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public EmailGeneratorService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }


    public String generateEmailReply(EmailRequest emailRequest) {
        // Build the promt
        String promt = buildPromt(emailRequest);

        // Craft a request
        Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", promt)
                        })
                }
        );

        // Do request and get response
        String response = webClient.post()
                .uri(geminiApiUrl)
                .header("Content-Type","application/json")
                .header("X-goog-api-key", geminiApiKey.trim())
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();



    // Extract response and return
    return extreactResponseContent(response);
    }

    private String extreactResponseContent(String response) {
        try {
            ObjectMapper mapper= new ObjectMapper();
            JsonNode rootNode= mapper.readTree(response);
            return rootNode.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text")
                    .asText();
        }catch( Exception e){
            return "Error processong request: " +e.getMessage();
        }
    }




    private String buildPromt(EmailRequest emailRequest) {


        StringBuilder promt= new StringBuilder();
        promt.append("Generate only a professional email reply for the following email content. Do not include a subject line or any introductory text. Just one email reply. Greetings like Hello and sign off like sincerly,yours etc are  needed.");
        if(emailRequest.getTone()!=null && !emailRequest.getTone().isEmpty()){
            promt.append(" Use a ").append(emailRequest.getTone()).append(" tone.");
        }

        promt.append("\n Original email: \n").append(emailRequest.getEmailContent());
        return promt.toString();
    }
}
