import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Eye, MessageCircle, X, Send, MapPin } from 'lucide-react-native';

const viewedMeUsers = [
  { id: 1, age: 33, image: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop', viewedAt: '2 hours ago', online: false, looking_for: 'something casual' },
  { id: 2, age: 34, image: 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop', viewedAt: '5 hours ago', online: true, looking_for: 'fun tonight' },
  { id: 3, age: 29, image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop', viewedAt: '1 day ago', online: false, looking_for: null },
  { id: 4, age: 35, image: 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop', viewedAt: '2 days ago', online: true, looking_for: 'friends first, see where it goes' },
  { id: 5, age: 43, image: 'https://images.pexels.com/photos/1382734/pexels-photo-1382734.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop', viewedAt: '3 days ago', online: false, looking_for: 'LTR' },
];

export default function ViewedMeScreen() {
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setSelectedUser(null);
  };

  const handleMessageFromProfile = () => {
    setShowProfile(false);
    const user = selectedUser;
    setChatMessages([
      { id: 1, text: `Hey! I saw you viewed my profile`, sender: 'me', time: 'now' }
    ]);
    setShowChat(true);
    // selectedUser remains set
    setSelectedUser(user);
  };

  const handleMessageClick = (user: any) => {
    setSelectedUser(user);
    setChatMessages([
      { id: 1, text: `Hey! I saw you viewed my profile 😊`, sender: 'me', time: 'now' }
    ]);
    setShowChat(true);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now(),
        text: message.trim(),
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, newMessage]);
      setMessage('');
      
      // Simulate response after 2 seconds
      setTimeout(() => {
        const response = {
          id: Date.now() + 1,
          text: "Thanks for reaching out! I'd love to chat more 😊",
          sender: 'them',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, response]);
      }, 2000);
    }
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedUser(null);
    setMessage('');
    setChatMessages([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Viewed Me</Text>
        <Text style={styles.headerSubtitle}>People who checked out your profile</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {viewedMeUsers.length > 0 ? (
          <View style={styles.usersList}>
            {viewedMeUsers.map((user) => (
              <TouchableOpacity key={user.id} style={styles.userCard} onPress={() => handleUserClick(user)} activeOpacity={0.8}>
                <View style={styles.userImageContainer}>
                  <Image
                    source={{ uri: user.image }}
                    style={styles.userImage}
                  />
                  {user.online && <View style={styles.onlineStatus} />}
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.age} y/o</Text>
                  <View style={styles.viewedInfo}>
                    <Eye size={14} color="#9CA3AF" />
                    <Text style={styles.viewedText}>Viewed {user.viewedAt}</Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={(e) => { e.stopPropagation(); handleMessageClick(user); }}
                  activeOpacity={0.7}
                >
                  <MessageCircle size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Eye size={64} color="#6B7280" />
            </View>
            <Text style={styles.emptyTitle}>No Profile Views Yet</Text>
            <Text style={styles.emptySubtitle}>
              When someone views your profile, they'll appear here
            </Text>
            <Text style={styles.emptyDescription}>
              Make sure your profile is complete and engaging to attract more views!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={showProfile}
        transparent
        animationType="slide"
        onRequestClose={handleCloseProfile}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModal}>
            <View style={styles.profileModalHeader}>
              <TouchableOpacity onPress={handleCloseProfile} style={styles.profileCloseButton}>
                <X size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {selectedUser && (
              <FlatList
                data={[selectedUser]}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.profileContent}
                renderItem={() => (
                  <>
                    <View style={styles.profileImageContainer}>
                      <Image source={{ uri: selectedUser.image }} style={styles.profileImage} />
                      {selectedUser.online && <View style={styles.profileOnlineDot} />}
                    </View>
                    <View style={styles.profileInfoSection}>
                      <Text style={styles.profileAge}>{selectedUser.age} y/o</Text>
                      <View style={styles.profileMetaRow}>
                        <View style={[styles.profileStatusDot, selectedUser.online ? styles.dotOnline : styles.dotOffline]} />
                        <Text style={[styles.profileStatusText, selectedUser.online ? styles.textOnline : styles.textOffline]}>
                          {selectedUser.online ? 'Online now' : 'Recently active'}
                        </Text>
                      </View>
                      <View style={styles.profileViewedRow}>
                        <Eye size={14} color="#9CA3AF" />
                        <Text style={styles.profileViewedText}>Viewed {selectedUser.viewedAt}</Text>
                      </View>
                    </View>
                    {selectedUser.looking_for ? (
                      <View style={styles.profileLookingForBadge}>
                        <Text style={styles.profileLookingForText}>{selectedUser.looking_for}</Text>
                      </View>
                    ) : null}
                    <View style={styles.profileActionRow}>
                      <TouchableOpacity style={styles.profileMsgButton} onPress={handleMessageFromProfile}>
                        <MessageCircle size={20} color="#FFFFFF" />
                        <Text style={styles.profileMsgButtonText}>Send Message</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Quick Chat Modal */}
      <Modal
        visible={showChat}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseChat}
      >
        <KeyboardAvoidingView 
          style={styles.chatModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.chatModal}>
            {/* Chat Header */}
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderLeft}>
                <Image
                  source={{ uri: selectedUser?.image }}
                  style={styles.chatAvatar}
                />
                <View>
                  <Text style={styles.chatHeaderName}>{selectedUser?.age} y/o</Text>
                  <Text style={styles.chatHeaderStatus}>
                    {selectedUser?.online ? 'Online' : 'Recently active'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleCloseChat}
                style={styles.closeButton}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Chat Messages */}
            <ScrollView style={styles.chatMessages} showsVerticalScrollIndicator={false}>
              <View style={styles.messagesContainer}>
                {chatMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageWrapper,
                      msg.sender === 'me' ? styles.myMessageWrapper : styles.theirMessageWrapper
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        msg.sender === 'me' ? styles.myMessage : styles.theirMessage
                      ]}
                    >
                      <Text style={styles.messageText}>{msg.text}</Text>
                      <Text
                        style={[
                          styles.messageTime,
                          msg.sender === 'me' ? styles.myMessageTime : styles.theirMessageTime
                        ]}
                      >
                        {msg.time}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Message Input */}
            <View style={styles.messageInput}>
              <TextInput
                style={styles.textInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor="#6B7280"
                multiline
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={styles.sendButton}
              >
                <Send size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  usersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  userImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    backgroundColor: '#10B981',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  viewedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewedText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  messageButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  profileModal: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  profileCloseButton: {
    padding: 8,
  },
  profileContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profileImage: {
    width: 180,
    height: 220,
    borderRadius: 18,
  },
  profileOnlineDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#0F172A',
  },
  profileInfoSection: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  profileAge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#22C55E',
  },
  dotOffline: {
    backgroundColor: '#475569',
  },
  profileStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  textOnline: {
    color: '#22C55E',
  },
  textOffline: {
    color: '#475569',
  },
  profileViewedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  profileViewedText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  profileLookingForBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
  },
  profileLookingForText: {
    color: '#93C5FD',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  profileActionRow: {
    paddingTop: 8,
  },
  profileMsgButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  profileMsgButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatModal: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    paddingTop: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#10B981',
  },
  closeButton: {
    padding: 8,
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContainer: {
    paddingVertical: 16,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  myMessageWrapper: {
    alignItems: 'flex-end',
  },
  theirMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myMessage: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: '#374151',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  myMessageTime: {
    color: '#C7D2FE',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#9CA3AF',
  },
  messageInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: '#1F2937',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});