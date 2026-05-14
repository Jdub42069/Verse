import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  SafeAreaView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Settings, Send, MessageCircle, SlidersHorizontal, MapPin, LayoutList, Grid2x2 } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LocationService } from '@/services/locationService';

type SortOption = 'activity' | 'age' | 'distance';

export default function ExploreScreen() {
  const { profile: currentUserProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(50);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('activity');
  const [showSortMenu, setShowSortMenu] = useState(false);
  // Location features (all explicitly "safe" per legal analysis)
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLon, setMyLon] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const positions = [
    'Top', 'Bottom', 'Verse', 'Verse Top', 'Verse Bottom',
    'Side', 'Trans', 'Enby', 'Kink', 'Vanilla', 'RN', 'LTR',
  ];

  const sortLabels: Record<SortOption, string> = {
    activity: 'Recently Active',
    age: 'Age',
    distance: 'Distance',
  };

  useEffect(() => {
    loadProfiles();
    // Pre-fetch location for distance display (web uses browser Geolocation API)
    fetchMyLocation();
  }, []);

  const fetchMyLocation = async () => {
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyLat(pos.coords.latitude);
          setMyLon(pos.coords.longitude);
        },
        () => {},
        { timeout: 8000 }
      );
    } else {
      const result = await LocationService.getCurrentLocation();
      if (result) {
        setMyLat(result.coordinates.latitude);
        setMyLon(result.coordinates.longitude);
      }
    }
  };

  const handleNearMeToggle = async (value: boolean) => {
    if (value && myLat === null) {
      setLocationLoading(true);
      await fetchMyLocation();
      setLocationLoading(false);
    }
    setNearMeEnabled(value);
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, age, bio, avatar_url, location, positions, interests, verified, is_active, last_seen, created_at, is_admin, photo_verified, photo_verification_status, latitude, longitude, looking_for, relationship_status')
        .eq('is_active', true)
        .eq('verified', true)
        .neq('id', currentUserProfile?.id || '');

      if (error) {
        Alert.alert('Error', 'Failed to load profiles');
      } else {
        setProfiles(data || []);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfiles();
  };

  const handleUserClick = (user: Profile) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const handleMessageClick = (user: Profile) => {
    setSelectedUser(user);
    setQuickMessage('');
    setShowQuickChat(true);
  };

  const handleFilterClose = () => setShowFilter(false);

  const handleApplyFilter = () => {
    setShowFilter(false);
  };

  const handleQuickSend = async () => {
    if (!quickMessage.trim() || !selectedUser) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    try {
      setSending(true);
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserProfile?.id,
          receiver_id: selectedUser.id,
          content: quickMessage.trim(),
        });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Message sent!');
        setShowQuickChat(false);
        setQuickMessage('');
        setSelectedUser(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseQuickChat = () => {
    setShowQuickChat(false);
    setSelectedUser(null);
    setQuickMessage('');
  };

  const handleCloseUserProfile = () => {
    setShowUserProfile(false);
    setSelectedUser(null);
  };

  const togglePosition = (position: string) => {
    setSelectedPositions(prev =>
      prev.includes(position) ? prev.filter(p => p !== position) : [...prev, position]
    );
  };

  const isOnline = (lastSeen: string) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const formatLastSeen = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getDistance = (user: Profile): number | null => {
    if (myLat === null || myLon === null || user.latitude == null || user.longitude == null) return null;
    return LocationService.calculateDistance(myLat, myLon, user.latitude, user.longitude);
  };

  const formatDistance = (miles: number | null): string | null => {
    if (miles === null) return null;
    if (miles < 0.5) return 'Less than 1 mi';
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
  };

  const filteredProfiles = profiles
    .filter(user => {
      const ageMatch = user.age >= minAge && user.age <= maxAge;
      const positionMatch = selectedPositions.length === 0 ||
        selectedPositions.some(pos => user.positions?.includes(pos));
      if (!ageMatch || !positionMatch) return false;
      // "Near Me" toggle: user-initiated radius filter (explicitly safe)
      if (nearMeEnabled && myLat !== null && myLon !== null) {
        const dist = getDistance(user);
        if (dist === null || dist > radiusMiles) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'age') return a.age - b.age;
      if (sortBy === 'distance') {
        const da = getDistance(a) ?? Infinity;
        const db = getDistance(b) ?? Infinity;
        return da - db;
      }
      return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
    });

  const renderListItem = ({ item: user }: { item: Profile }) => {
    const distLabel = formatDistance(getDistance(user));
    return (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => handleUserClick(user)}
      activeOpacity={0.7}
    >
      <View style={styles.listAvatarWrap}>
        <Image
          source={{ uri: user.avatar_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop' }}
          style={styles.listAvatar}
        />
        {isOnline(user.last_seen) && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.listInfo}>
        <View style={styles.listInfoTop}>
          <View style={styles.listNameRow}>
            <Text style={styles.listName}>{user.age}</Text>
            <View style={[styles.statusDot, isOnline(user.last_seen) ? styles.statusDotOnline : styles.statusDotOffline]} />
            <Text style={[styles.statusLabel, isOnline(user.last_seen) ? styles.statusLabelOnline : styles.statusLabelOffline]}>
              {isOnline(user.last_seen) ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={styles.listMetaRight}>
            {distLabel && (
              <View style={styles.distanceBadge}>
                <MapPin size={10} color="#60A5FA" />
                <Text style={styles.distanceText}>{distLabel}</Text>
              </View>
            )}
            <Text style={styles.listTime}>{formatLastSeen(user.last_seen)}</Text>
          </View>
        </View>
        {user.looking_for ? (
          <Text style={styles.listLookingFor} numberOfLines={1}>{user.looking_for}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.listMessageBtn}
        onPress={(e) => { e.stopPropagation(); handleMessageClick(user); }}
        activeOpacity={0.8}
      >
        <MessageCircle size={20} color="#60A5FA" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
  };

  const GRID_COLS = 2;
  const screenWidth = Dimensions.get('window').width;
  const gridItemSize = (screenWidth - 16 * 2 - 10) / GRID_COLS;

  const renderGridItem = ({ item: user }: { item: Profile }) => {
    const distLabel = formatDistance(getDistance(user));
    const online = isOnline(user.last_seen);
    return (
      <TouchableOpacity
        style={[styles.gridCard, { width: gridItemSize }]}
        onPress={() => handleUserClick(user)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: user.avatar_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop' }}
          style={[styles.gridImage, { width: gridItemSize, height: gridItemSize }]}
        />
        {online && <View style={styles.gridOnlineDot} />}
        <View style={styles.gridOverlay}>
          <Text style={styles.gridAge}>{user.age}</Text>
          {distLabel && (
            <View style={styles.gridDistBadge}>
              <MapPin size={9} color="#93C5FD" />
              <Text style={styles.gridDistText}>{distLabel}</Text>
            </View>
          )}
        </View>
        {user.looking_for ? (
          <View style={styles.gridLookingForBadge}>
            <Text style={styles.gridLookingForText} numberOfLines={1}>{user.looking_for}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.gridMsgBtn}
          onPress={(e) => { e.stopPropagation(); handleMessageClick(user); }}
          activeOpacity={0.8}
        >
          <MessageCircle size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#60A5FA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>verse</Text>
          <Text style={styles.logoStar}>*</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSortMenu(true)}>
            <SlidersHorizontal size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, viewMode === 'grid' && styles.iconBtnActive]}
            onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list'
              ? <Grid2x2 size={18} color="#9CA3AF" />
              : <LayoutList size={18} color="#60A5FA" />
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFilter(true)}>
            <Settings size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Near Me toggle bar */}
      <View style={styles.nearMeBar}>
        <View style={styles.nearMeLeft}>
          <MapPin size={14} color={nearMeEnabled ? '#60A5FA' : '#64748B'} />
          <Text style={[styles.nearMeLabel, nearMeEnabled && styles.nearMeLabelActive]}>
            Near Me{nearMeEnabled ? ` · ${radiusMiles} mi` : ''}
          </Text>
          {locationLoading && <ActivityIndicator size="small" color="#60A5FA" style={{ marginLeft: 6 }} />}
        </View>
        <Switch
          value={nearMeEnabled}
          onValueChange={handleNearMeToggle}
          trackColor={{ false: '#1E293B', true: '#1D4ED8' }}
          thumbColor={nearMeEnabled ? '#60A5FA' : '#475569'}
        />
      </View>

      {/* Sort bar */}
      <View style={styles.sortBar}>
        <Text style={styles.sortBarLabel}>
          {filteredProfiles.length} {filteredProfiles.length === 1 ? 'member' : 'members'} · {sortLabels[sortBy]}
        </Text>
      </View>

      <FlatList
        key={viewMode}
        data={filteredProfiles}
        keyExtractor={(item) => item.id}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#60A5FA" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No members found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* Sort menu */}
      <Modal
        visible={showSortMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortMenu(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortMenu(false)}>
          <View style={styles.sortMenuContent}>
            <Text style={styles.sortMenuTitle}>Sort Members</Text>
            {(['activity', 'age', 'distance'] as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.sortOption, sortBy === option && styles.sortOptionActive]}
                onPress={() => { setSortBy(option); setShowSortMenu(false); }}
              >
                <Text style={[styles.sortOptionText, sortBy === option && styles.sortOptionTextActive]}>
                  {sortLabels[option]}
                </Text>
                {sortBy === option && <Text style={styles.sortCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter modal */}
      <Modal
        visible={showFilter}
        transparent
        animationType="fade"
        onRequestClose={handleFilterClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter</Text>
              <TouchableOpacity onPress={handleFilterClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sliderContainer}>
              <Text style={styles.ageRangeText}>Age Range: {minAge} – {maxAge}</Text>
              <View style={styles.sliderWrapper}>
                <Text style={styles.sliderLabel}>Min Age: {minAge}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={18}
                  maximumValue={99}
                  value={minAge}
                  onValueChange={(v) => setMinAge(Math.round(v))}
                  minimumTrackTintColor="#60A5FA"
                  maximumTrackTintColor="#374151"
                />
                <Text style={styles.sliderLabel}>Max Age: {maxAge}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={18}
                  maximumValue={99}
                  value={maxAge}
                  onValueChange={(v) => setMaxAge(Math.round(v))}
                  minimumTrackTintColor="#60A5FA"
                  maximumTrackTintColor="#374151"
                />
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <View style={styles.radiusHeader}>
                <Text style={styles.ageRangeText}>Search Radius: {radiusMiles} mi</Text>
                <Switch
                  value={nearMeEnabled}
                  onValueChange={handleNearMeToggle}
                  trackColor={{ false: '#1E293B', true: '#1D4ED8' }}
                  thumbColor={nearMeEnabled ? '#60A5FA' : '#475569'}
                />
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={100}
                value={radiusMiles}
                onValueChange={(v) => setRadiusMiles(Math.round(v))}
                minimumTrackTintColor={nearMeEnabled ? '#60A5FA' : '#475569'}
                maximumTrackTintColor="#374151"
                disabled={!nearMeEnabled}
              />
            </View>

            <View style={styles.positionsSection}>
              <Text style={styles.positionsTitle}>Positions & Identity</Text>
              <View style={styles.positionsGrid}>
                {positions.map((position) => (
                  <TouchableOpacity
                    key={position}
                    style={[styles.positionToggle, selectedPositions.includes(position) && styles.positionToggleActive]}
                    onPress={() => togglePosition(position)}
                  >
                    <Text style={[styles.positionText, selectedPositions.includes(position) && styles.positionTextActive]}>
                      {position}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleFilterClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilter}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick chat modal */}
      <Modal
        visible={showQuickChat}
        transparent
        animationType="slide"
        onRequestClose={handleCloseQuickChat}
      >
        <View style={styles.quickChatOverlay}>
          <View style={styles.quickChatModal}>
            <View style={styles.quickChatHeader}>
              <View style={styles.quickChatHeaderLeft}>
                <Image source={{ uri: selectedUser?.avatar_url }} style={styles.quickChatAvatar} />
                <View>
                  <Text style={styles.quickChatName}>{selectedUser?.age} y/o</Text>
                  <Text style={styles.quickChatStatus}>
                    {selectedUser && isOnline(selectedUser.last_seen) ? 'Online now' : 'Recently active'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleCloseQuickChat} style={styles.quickChatClose}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickMessageContainer}>
              <View style={styles.quickMessageInput}>
                <TextInput
                  style={styles.quickMessageTextInput}
                  value={quickMessage}
                  onChangeText={setQuickMessage}
                  placeholder="Type a message..."
                  placeholderTextColor="#6B7280"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleQuickSend}
                  style={[styles.quickSendButton, sending && styles.quickSendButtonDisabled]}
                  disabled={sending}
                >
                  {sending
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Send size={20} color="#FFFFFF" />
                  }
                </TouchableOpacity>
              </View>
              <Text style={styles.characterCount}>{quickMessage.length}/500</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* User profile modal */}
      <Modal
        visible={showUserProfile}
        transparent
        animationType="slide"
        onRequestClose={handleCloseUserProfile}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModal}>
            <View style={styles.profileModalHeader}>
              <TouchableOpacity onPress={handleCloseUserProfile} style={styles.profileCloseButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            {selectedUser && (
              <FlatList
                data={[selectedUser]}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.profileContent}
                renderItem={() => (
                  <>
                    <View style={styles.profileImageContainer}>
                      <Image source={{ uri: selectedUser.avatar_url }} style={styles.profileImage} />
                      {isOnline(selectedUser.last_seen) && <View style={styles.profileOnlineStatus} />}
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>{selectedUser.age} y/o</Text>
                      {selectedUser.location ? (
                        <Text style={styles.profileLocationText}>{selectedUser.location}</Text>
                      ) : null}
                      <View style={styles.profileMetaRow}>
                        {formatDistance(getDistance(selectedUser)) && (
                          <View style={styles.profileDistanceBadge}>
                            <MapPin size={12} color="#60A5FA" />
                            <Text style={styles.profileDistanceText}>{formatDistance(getDistance(selectedUser))}</Text>
                          </View>
                        )}
                        <Text style={styles.profileLastSeen}>{formatLastSeen(selectedUser.last_seen)}</Text>
                      </View>
                    </View>
                    {selectedUser.looking_for ? (
                      <View style={styles.profileLookingFor}>
                        <Text style={styles.profileLookingForText}>{selectedUser.looking_for}</Text>
                      </View>
                    ) : null}
                    {selectedUser.relationship_status ? (
                      <View style={styles.profileRelStatusBadge}>
                        <Text style={styles.profileRelStatusText}>{selectedUser.relationship_status}</Text>
                      </View>
                    ) : null}
                    {selectedUser.positions && selectedUser.positions.length > 0 && (
                      <View style={styles.profileTagsSection}>
                        <View style={styles.profileTags}>
                          {selectedUser.positions.map((pos, i) => (
                            <View key={i} style={styles.profileTag}>
                              <Text style={styles.profileTagText}>{pos}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    <View style={styles.profileAbout}>
                      <Text style={styles.profileAboutTitle}>About</Text>
                      {selectedUser.bio ? (
                        <Text style={styles.profileAboutText}>{selectedUser.bio}</Text>
                      ) : (
                        <Text style={styles.profileAboutEmpty}>No bio added yet.</Text>
                      )}
                    </View>
                    {selectedUser.interests && selectedUser.interests.length > 0 && (
                      <View style={styles.profileInterests}>
                        <Text style={styles.profileInterestsTitle}>Interests</Text>
                        <View style={styles.profileInterestsContainer}>
                          {selectedUser.interests.map((interest, i) => (
                            <View key={i} style={styles.profileInterestTag}>
                              <Text style={styles.profileInterestText}>{interest}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    <View style={styles.profileActions}>
                      <TouchableOpacity
                        style={styles.profileMessageButton}
                        onPress={() => { handleCloseUserProfile(); handleMessageClick(selectedUser); }}
                      >
                        <MessageCircle size={20} color="#FFFFFF" />
                        <Text style={styles.profileMessageButtonText}>Send Message</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  logoStar: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginLeft: 1,
    marginTop: -2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    backgroundColor: '#1E293B',
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearMeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  nearMeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nearMeLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  nearMeLabelActive: {
    color: '#60A5FA',
  },
  sortBar: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sortBarLabel: {
    color: '#64748B',
    fontSize: 13,
  },
  iconBtnActive: {
    backgroundColor: '#1E3A5F',
  },
  // Grid view
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  gridRow: {
    gap: 10,
    marginBottom: 10,
  },
  gridCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  gridImage: {
    resizeMode: 'cover',
  },
  gridOnlineDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    backgroundColor: '#22C55E',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(15,23,42,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridAge: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
  },
  gridDistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gridDistText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '500',
  },
  gridLookingForBadge: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  gridLookingForText: {
    color: '#93C5FD',
    fontSize: 11,
    fontStyle: 'italic',
  },
  gridMsgBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(37,99,235,0.85)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // List view
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  listAvatarWrap: {
    position: 'relative',
  },
  listAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#334155',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: '#22C55E',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  listInfo: {
    flex: 1,
    gap: 4,
  },
  listInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  listMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '500',
  },
  listNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listName: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotOnline: {
    backgroundColor: '#22C55E',
  },
  statusDotOffline: {
    backgroundColor: '#475569',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusLabelOnline: {
    color: '#22C55E',
  },
  statusLabelOffline: {
    color: '#475569',
  },
  listTime: {
    color: '#64748B',
    fontSize: 12,
  },
  listLocation: {
    color: '#94A3B8',
    fontSize: 13,
  },
  listTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  listTag: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  listTagText: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '500',
  },
  listBio: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  listLookingFor: {
    color: '#60A5FA',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    fontStyle: 'italic',
  },
  listMessageBtn: {
    padding: 6,
    alignSelf: 'center',
  },
  emptyState: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
  },
  // Sort menu
  sortMenuContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    width: 260,
  },
  sortMenuTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  sortOptionActive: {
    backgroundColor: '#0F172A',
  },
  sortOptionText: {
    color: '#CBD5E1',
    fontSize: 15,
  },
  sortOptionTextActive: {
    color: '#F1F5F9',
    fontWeight: '600',
  },
  sortCheck: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Filter modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#94A3B8',
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderContainer: {
    marginBottom: 24,
  },
  ageRangeText: {
    color: '#F1F5F9',
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  sliderWrapper: {
    gap: 12,
  },
  sliderLabel: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  positionsSection: {
    marginBottom: 24,
  },
  positionsTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  positionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionToggle: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#475569',
  },
  positionToggleActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#3B82F6',
  },
  positionText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
  },
  positionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Quick chat
  quickChatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  quickChatModal: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '60%',
  },
  quickChatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  quickChatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickChatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  quickChatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  quickChatStatus: {
    fontSize: 12,
    color: '#22C55E',
    marginTop: 1,
  },
  quickChatClose: {
    padding: 8,
  },
  quickMessageContainer: {
    padding: 20,
  },
  quickMessageInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 8,
  },
  quickMessageTextInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F1F5F9',
    fontSize: 15,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  quickSendButton: {
    backgroundColor: '#2563EB',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSendButtonDisabled: {
    opacity: 0.5,
  },
  characterCount: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'right',
  },
  // Profile modal
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  profileModal: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
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
  profileOnlineStatus: {
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
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  profileLocationText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  profileLastSeen: {
    fontSize: 13,
    color: '#64748B',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  profileDistanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  profileDistanceText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '500',
  },
  profileTagsSection: {
    marginBottom: 20,
  },
  profileTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  profileTag: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  profileTagText: {
    color: '#BFDBFE',
    fontSize: 13,
    fontWeight: '500',
  },
  profileLookingFor: {
    alignSelf: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.12)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
  },
  profileLookingForText: {
    color: '#93C5FD',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  profileRelStatusBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  profileRelStatusText: {
    color: '#86EFAC',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  profileAbout: {
    marginBottom: 20,
  },
  profileAboutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  profileAboutText: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  profileAboutEmpty: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  profileInterests: {
    marginBottom: 20,
  },
  profileInterestsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  profileInterestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileInterestTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileInterestText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  profileActions: {
    paddingTop: 8,
  },
  profileMessageButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  profileMessageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
