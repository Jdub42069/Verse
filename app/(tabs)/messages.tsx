import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Send, Flag, X, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { containsBlockedWord } from '@/lib/blockedWords';

interface Conversation {
  id: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'them';
  time: string;
  isPhoto?: boolean;
}

const PHOTO_PREFIX = 'photo:';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openConvo, setOpenConvo] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          read,
          sender_id,
          receiver_id,
          sender:profiles!messages_sender_id_fkey(id, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const convoMap = new Map<string, Conversation>();
      (data || []).forEach((msg: any) => {
        const isMe = msg.sender_id === user.id;
        const otherUser = isMe ? msg.receiver : msg.sender;
        if (!otherUser) return;
        const otherId = otherUser.id;
        if (!convoMap.has(otherId)) {
          const content: string = msg.content || '';
          const lastMessage = content.startsWith(PHOTO_PREFIX) ? 'Photo' : content;
          convoMap.set(otherId, {
            id: otherId,
            avatar: otherUser.avatar_url || 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=300&h=400&fit=crop',
            lastMessage,
            lastMessageTime: formatTime(msg.created_at),
            unread: !msg.read && msg.receiver_id === user.id,
          });
        }
      });

      setConversations(Array.from(convoMap.values()));
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (otherId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      setChatMessages(
        (data || []).map((m: any) => {
          const content: string = m.content || '';
          const isPhoto = content.startsWith(PHOTO_PREFIX);
          return {
            id: m.id,
            text: isPhoto ? content.slice(PHOTO_PREFIX.length) : content,
            sender: m.sender_id === user.id ? 'me' : 'them',
            time: formatTime(m.created_at),
            isPhoto,
          };
        })
      );

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherId);
    } catch (err) {
      console.error('Error loading chat:', err);
    }
  };

  const handleOpenConvo = (convo: Conversation) => {
    setOpenConvo(convo);
    loadChatMessages(convo.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !openConvo || sending) return;
    if (containsBlockedWord(newMessage)) {
      setMessageError('Your message contains a word or phrase that is not permitted.');
      return;
    }
    await sendContent(newMessage.trim());
    setNewMessage('');
  };

  const handleSendPhoto = async () => {
    if (!user || !openConvo || sending) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to send photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Error', 'Could not read image data.');
      return;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${asset.base64}`;
    await sendContent(`${PHOTO_PREFIX}${dataUri}`);
  };

  const sendContent = async (content: string) => {
    if (!user || !openConvo) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: openConvo.id,
          content,
        })
        .select('id, created_at')
        .maybeSingle();

      if (error) throw error;

      const isPhoto = content.startsWith(PHOTO_PREFIX);
      setChatMessages(prev => [
        ...prev,
        {
          id: data?.id || String(Date.now()),
          text: isPhoto ? content.slice(PHOTO_PREFIX.length) : content,
          sender: 'me',
          time: formatTime(data?.created_at || new Date().toISOString()),
          isPhoto,
        },
      ]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim() || !user || !openConvo) return;
    try {
      await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_id: openConvo.id,
        reason: reportReason,
      });
      Alert.alert('Report Submitted', "Thank you. We'll review and take action.", [
        { text: 'OK', onPress: () => { setShowReportModal(false); setReportReason(''); } }
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  };

  if (openConvo) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => { setOpenConvo(null); loadConversations(); }} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: openConvo.avatar }} style={styles.chatAvatar} />
            <View style={styles.chatHeaderInfo} />
            <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.reportButton}>
              <Flag size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.chatMessages}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            <View style={styles.messagesContainer}>
              {chatMessages.length === 0 && (
                <Text style={styles.emptyChat}>No messages yet. Say hi!</Text>
              )}
              {chatMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageWrapper,
                    msg.sender === 'me' ? styles.myMessageWrapper : styles.theirMessageWrapper,
                  ]}
                >
                  {msg.isPhoto ? (
                    <TouchableOpacity
                      onPress={() => setLightboxUri(msg.text)}
                      activeOpacity={0.85}
                      style={[styles.photoBubble, msg.sender === 'me' ? styles.myPhotoBubble : styles.theirPhotoBubble]}
                    >
                      <Image
                        source={{ uri: msg.text }}
                        style={styles.chatPhoto}
                        resizeMode="cover"
                      />
                      <Text style={[styles.photoTime, msg.sender === 'me' ? styles.myMessageTime : styles.theirMessageTime]}>
                        {msg.time}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.messageBubble, msg.sender === 'me' ? styles.myMessage : styles.theirMessage]}>
                      <Text style={styles.messageText}>{msg.text}</Text>
                      <Text style={[styles.messageTime, msg.sender === 'me' ? styles.myMessageTime : styles.theirMessageTime]}>
                        {msg.time}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          {!!messageError && (
            <View style={styles.messageErrorBanner}>
              <Text style={styles.messageErrorText}>{messageError}</Text>
            </View>
          )}
          <View style={styles.messageInput}>
            <TouchableOpacity
              onPress={handleSendPhoto}
              style={styles.photoButton}
              disabled={sending}
            >
              <ImageIcon size={22} color="#9CA3AF" />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={v => { setMessageError(null); setNewMessage(v); }}
              placeholder="Type a message..."
              placeholderTextColor="#6B7280"
              multiline
            />
            <TouchableOpacity onPress={handleSend} style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]} disabled={sending || !newMessage.trim()}>
              {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send size={20} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Lightbox */}
        <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
              <X size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {lightboxUri && (
              <Image
                source={{ uri: lightboxUri }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
          <View style={styles.reportModalOverlay}>
            <View style={styles.reportModal}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>Report User</Text>
                <TouchableOpacity onPress={() => { setShowReportModal(false); setReportReason(''); }}>
                  <X size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.reportSubtitle}>Help us keep the community safe</Text>
              <View style={styles.reportOptions}>
                {['Fake Profile', 'Bot/Spam Account', 'Illegal Imagery', 'Harassment', 'Inappropriate Content', 'Other'].map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reportOption, reportReason === reason && styles.reportOptionSelected]}
                    onPress={() => setReportReason(reason)}
                  >
                    <Text style={[styles.reportOptionText, reportReason === reason && styles.reportOptionTextSelected]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.reportActions}>
                <TouchableOpacity style={styles.reportCancelButton} onPress={() => { setShowReportModal(false); setReportReason(''); }}>
                  <Text style={styles.reportCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reportSubmitButton, !reportReason && styles.reportSubmitButtonDisabled]}
                  onPress={handleSubmitReport}
                  disabled={!reportReason}
                >
                  <Text style={styles.reportSubmitText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>Start a conversation from the Explore tab</Text>
        </View>
      ) : (
        <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
          {conversations.map((convo) => (
            <TouchableOpacity
              key={convo.id}
              style={styles.messageItem}
              onPress={() => handleOpenConvo(convo)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                <Image source={{ uri: convo.avatar }} style={styles.avatar} />
                {convo.unread && <View style={styles.unreadBadge} />}
              </View>
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={[styles.messageName, convo.unread && styles.unreadText]}>Anonymous</Text>
                  <Text style={styles.messageTime}>{convo.lastMessageTime}</Text>
                </View>
                <Text style={[styles.lastMessage, convo.unread && styles.unreadText]} numberOfLines={1}>
                  {convo.lastMessage}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
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
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  messageTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  lastMessage: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  unreadText: {
    color: '#FFFFFF',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 20,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  reportButton: {
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 20,
  },
  chatMessages: {
    flex: 1,
  },
  emptyChat: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
    fontSize: 16,
  },
  messagesContainer: {
    padding: 16,
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
    backgroundColor: '#3B82F6',
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
  myMessageTime: {
    fontSize: 11,
    color: '#BFDBFE',
    textAlign: 'right',
  },
  theirMessageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  photoBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  myPhotoBubble: {
    borderBottomRightRadius: 4,
  },
  theirPhotoBubble: {
    borderBottomLeftRadius: 4,
  },
  chatPhoto: {
    width: 200,
    height: 240,
    borderRadius: 12,
  },
  photoTime: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'right',
  },
  messageErrorBanner: {
    backgroundColor: '#7F1D1D',
    borderTopWidth: 1,
    borderTopColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageErrorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
  },
  messageInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 8,
  },
  photoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1D4ED8',
    opacity: 0.5,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  lightboxImage: {
    width: '100%',
    height: '85%',
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  reportModal: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  reportOptions: {
    gap: 8,
    marginBottom: 24,
  },
  reportOption: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  reportOptionSelected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  reportOptionText: {
    color: '#D1D5DB',
    fontSize: 15,
    fontWeight: '500',
  },
  reportOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  reportCancelButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reportSubmitButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportSubmitButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  reportSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
