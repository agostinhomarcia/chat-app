import React, { useEffect, useState, useRef } from "react";
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from "react-native";
import io from "socket.io-client";
import {
  getBotResponse,
  detectContext,
  getResponseDelay,
} from "./chatResponses";

const socket = io("http://192.168.1.6:3000");

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  time: string;
  read?: boolean;
  fadeAnim?: Animated.Value;
  status: "sent" | "delivered";
};

const App = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSeen, setLastSeen] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const typingDots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    socket.on("chat message", (msg) => {
      setMessages((prevMessages) => {
        if (!prevMessages.some((m) => m.id === msg.id)) {
          return [...prevMessages, msg];
        }
        return prevMessages;
      });
    });

    return () => {
      socket.off("chat message");
    };
  }, []);

  const createMessage = (content: string, isUser: boolean): Message => ({
    id: Date.now().toString(),
    content,
    isUser,
    time: new Date().toLocaleTimeString(),
    status: "sent",
    fadeAnim: new Animated.Value(1),
  });

  const markMessagesAsRead = () => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) => (msg.isUser ? { ...msg, read: true } : msg))
    );
  };

  useEffect(() => {
    if (isBotTyping) {
      const animations = typingDots.map((dot, i) =>
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.loop(
            Animated.sequence([
              Animated.timing(dot, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(dot, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ])
          ),
        ])
      );

      Animated.parallel(animations).start();
    } else {
      typingDots.forEach((dot) => {
        dot.setValue(0);
        dot.stopAnimation();
      });
    }
  }, [isBotTyping]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const oldMessages = [
        createMessage("Mensagem antiga 1", false),
        createMessage("Mensagem antiga 2", true),
      ];
      setMessages((prev) => [...oldMessages, ...prev]);
    } catch (error) {
      console.error("Erro ao carregar mensagens antigas:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const userMessage = createMessage(message, true);
      setMessages((prev) => [...prev, userMessage]);
      setMessage("");

      // Simular entrega da mensagem
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id ? { ...msg, status: "delivered" } : msg
          )
        );
      }, 1000);

      // Bot digitando
      setIsBotTyping(true);

      // Simular resposta do bot
      setTimeout(() => {
        setIsBotTyping(false);
        const botResponse = "Olá! Como posso ajudar? 😊";
        const botMessage = createMessage(botResponse, false);

        setMessages((prev) => [...prev, botMessage]);

        // Scroll para a última mensagem
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 2000);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageWrapper,
        item.isUser ? styles.userMessageWrapper : styles.botMessageWrapper,
      ]}
    >
      <View
        style={[
          styles.messageContainer,
          item.isUser
            ? styles.userMessageContainer
            : styles.botMessageContainer,
        ]}
      >
        <Text style={[styles.messageText, item.isUser && { color: "#FFFFFF" }]}>
          {item.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.timestamp,
              item.isUser ? styles.userTimestamp : styles.botTimestamp,
            ]}
          >
            {item.time}
          </Text>
          {item.isUser && (
            <Text style={styles.messageStatus}>
              {item.status === "sent" ? "✓" : "✓✓"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.botInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
          <View>
            <Text style={styles.botName}>Assistente Virtual</Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? "#4CAF50" : "#999" },
                ]}
              />
              <Text style={styles.statusText}>
                {isOnline ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onScroll={() => markMessagesAsRead()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {lastSeen && (
        <Text style={styles.lastSeen}>Visto por último às {lastSeen}</Text>
      )}

      {isBotTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>🤖 digitando</Text>
          <View style={styles.typingDots}>
            {typingDots.map((dot, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    transform: [
                      {
                        translateY: dot.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -8],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !message && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!message}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  botInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 20,
  },
  botName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  messagesList: {
    padding: 15,
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-end",
  },
  userMessageWrapper: {
    justifyContent: "flex-end",
  },
  botMessageWrapper: {
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  messageContainer: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 20,
  },
  userMessageContainer: {
    backgroundColor: "#0084ff",
    borderBottomRightRadius: 5,
  },
  botMessageContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  botTimestamp: {
    color: "#999",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  typingText: {
    fontSize: 12,
    color: "#666",
    marginRight: 5,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#999",
    marginHorizontal: 2,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0084ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  readStatus: {
    fontSize: 12,
    marginLeft: 5,
    color: "rgba(255, 255, 255, 0.7)",
  },
  lastSeen: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    padding: 5,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  retryButton: {
    marginLeft: 8,
    padding: 4,
  },
  retryText: {
    color: "#FF4444",
    fontSize: 12,
  },
  messageStatus: {
    fontSize: 12,
    marginLeft: 4,
    color: "rgba(255, 255, 255, 0.7)",
  },
});

export default App;
