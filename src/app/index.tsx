import React, { useEffect, useState, useRef } from "react";
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
} from "react-native";
import io from "socket.io-client";
import { getBotResponse } from "./chatResponses";

const socket = io("http://192.168.1.6:3000"); // Substitua pelo IP local do seu computador

const App = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { text: string; time: string; sender: string }[]
  >([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    socket.on("chat message", (msg) => {
      setMessages((prevMessages) => {
        if (
          !prevMessages.some((m) => m.text === msg.text && m.time === msg.time)
        ) {
          return [...prevMessages, msg];
        }
        return prevMessages;
      });
    });

    return () => {
      socket.off("chat message");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const timestamp = new Date().toLocaleTimeString();
      const msgWithTimestamp = {
        text: message,
        time: timestamp,
        sender: "user",
      };
      socket.emit("chat message", msgWithTimestamp);
      setMessages((prevMessages) => [...prevMessages, msgWithTimestamp]);

      setIsBotTyping(true);
      setTimeout(() => {
        const botResponse = {
          text: getBotResponse(message),
          time: new Date().toLocaleTimeString(),
          sender: "bot",
        };
        setMessages((prevMessages) => [...prevMessages, botResponse]);
        setIsBotTyping(false);
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 1000);

      setMessage("");
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => (
          <View
            style={
              item.sender === "user"
                ? styles.userMessageContainer
                : styles.botMessageContainer
            }
          >
            <Text
              style={
                item.sender === "user" ? styles.userMessage : styles.botMessage
              }
            >
              {item.text}
            </Text>
            <Text
              style={
                item.sender === "user"
                  ? styles.userTimestamp
                  : styles.botTimestamp
              }
            >
              {item.time}
            </Text>
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
      {isBotTyping && <Text>Bot está digitando...</Text>}
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Digite sua mensagem"
      />
      <Button title="Enviar" onPress={sendMessage} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    backgroundColor: "#0084ff",
    borderRadius: 20,
    marginVertical: 5,
    marginHorizontal: 10,
    maxWidth: "70%",
    padding: 10,
  },
  userMessage: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    marginTop: 5,
  },
  botMessageContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#e9ecef",
    borderRadius: 20,
    marginVertical: 5,
    marginHorizontal: 10,
    maxWidth: "70%",
    padding: 10,
  },
  botMessage: {
    color: "#000000",
    fontSize: 16,
  },
  botTimestamp: {
    color: "#666666",
    fontSize: 10,
    marginTop: 5,
  },
});

export default App;
