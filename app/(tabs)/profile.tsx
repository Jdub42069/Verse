import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Settings, Camera, MapPin, LogOut, Check, Navigation, Bug, ShieldCheck, Plus, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LocationService } from '@/services/locationService';
import { BugReportModal } from '@/components/BugReportModal';
import { containsBlockedWord } from '@/lib/blockedWords';

const POSITIONS = ['Top', 'Bottom', 'Verse', 'Verse Top', 'Verse Bottom', 'Side', 'Trans', 'Enby', 'Kink', 'Vanilla', 'RN', 'LTR', 'Gay'];
const RELATIONSHIP_STATUSES = ['Single', 'Open Relationship', 'Married', 'Not Looking'];
const INTERESTS = ['Photography', 'Hiking', 'Cooking', 'Travel', 'Music', 'Art', 'Fitness', 'Reading', 'Gaming', 'Film'];

export default function ProfileScreen() {
  const { user, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [bio, setBio] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [hivStatus, setHivStatus] = useState<'negative' | 'positive' | 'undetectable' | null>(null);
  const [onPrep, setOnPrep] = useState(false);
  const [noStis, setNoStis] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [blockedFieldError, setBlockedFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || '');
      setLookingFor(profile.looking_for || '');
      setLocation(profile.location || '');
      setLatitude(profile.latitude || null);
      setLongitude(profile.longitude || null);
      setSelectedPositions(profile.positions || []);
      setSelectedInterests(profile.interests || []);
      setHivStatus(profile.hiv_status ?? null);
      setOnPrep(profile.on_prep ?? false);
      setNoStis(profile.no_stis ?? false);
      setLastTestedAt(profile.last_tested_at || '');
      setRelationshipStatus(profile.relationship_status ?? null);
      setProfilePhotos(profile.profile_photos || (profile.avatar_url ? [profile.avatar_url] : []));
    }
  }, [profile]);

  const makeChangeHandler = (setter: (v: string) => void) => (value: string) => {
    if (containsBlockedWord(value)) {
      setBlockedFieldError('This field contains a word or phrase that is not permitted.');
    } else {
      setBlockedFieldError(null);
    }
    setter(value);
  };

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleDetectLocation = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Location detection is only available on mobile devices.');
      return;
    }

    setDetectingLocation(true);
    try {
      const result = await LocationService.getCurrentLocation();

      if (result) {
        setLatitude(result.coordinates.latitude);
        setLongitude(result.coordinates.longitude);
        if (result.address) {
          setLocation(result.address);
        }
        Alert.alert('Success', 'Location detected successfully!');
      } else {
        Alert.alert(
          'Location Access',
          'Unable to access location. Please enable location permissions in your device settings.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to detect location. Please try again.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleAddPhoto = async () => {
    if (profilePhotos.length >= 3) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to upload photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, blob, { contentType: `image/${ext}`, upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('profile-photos').getPublicUrl(fileName);
      setProfilePhotos(prev => [...prev, data.publicUrl]);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Could not upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const url = profilePhotos[index];
    const updated = profilePhotos.filter((_, i) => i !== index);
    setProfilePhotos(updated);
    // Best-effort delete from storage
    try {
      const path = url.split('/profile-photos/')[1];
      if (path) {
        await supabase.storage.from('profile-photos').remove([decodeURIComponent(path)]);
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!user) return;
    const fieldsToCheck = [bio, lookingFor, location, lastTestedAt];
    const blockedField = fieldsToCheck.find(f => containsBlockedWord(f));
    if (blockedField) {
      Alert.alert('Not Allowed', 'Your profile contains a word or phrase that is not permitted. Please review and update your text.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio,
          looking_for: lookingFor || null,
          location,
          latitude,
          longitude,
          location_updated_at: latitude && longitude ? new Date().toISOString() : null,
          positions: selectedPositions,
          interests: selectedInterests,
          hiv_status: hivStatus,
          on_prep: onPrep,
          no_stis: noStis,
          last_tested_at: lastTestedAt || null,
          relationship_status: relationshipStatus || null,
          profile_photos: profilePhotos,
          avatar_url: profilePhotos[0] || profile?.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      setEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  if (!profile) {
    if (authLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorTitle}>Couldn't load your profile</Text>
          <Text style={styles.errorMessage}>
            We had trouble fetching your profile. Try again, or sign out and back in.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            disabled={retrying}
            onPress={async () => {
              setRetrying(true);
              await refreshProfile();
              setRetrying(false);
            }}
          >
            {retrying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.retryButtonText}>Try Again</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutFallbackButton} onPress={() => signOut()}>
            <Text style={styles.signOutFallbackText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerActions}>
            {editing ? (
              <TouchableOpacity onPress={handleSave} style={[styles.saveButton, !!blockedFieldError && styles.saveButtonDisabled]} disabled={saving || !!blockedFieldError}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Check size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.editIconButton}>
                <Settings size={24} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
              <LogOut size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {editing && !!blockedFieldError && (
          <View style={styles.blockedWordBanner}>
            <Text style={styles.blockedWordBannerText}>{blockedFieldError}</Text>
          </View>
        )}

        <View style={styles.profileSection}>
          <View style={styles.photosRow}>
            {profilePhotos.map((uri, index) => (
              <View key={uri} style={styles.photoThumbContainer}>
                <Image source={{ uri }} style={styles.photoThumb} />
                {index === 0 && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Main</Text>
                  </View>
                )}
                {editing && (
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Trash2 size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {editing && profilePhotos.length < 3 && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <>
                    <Plus size={24} color="#3B82F6" />
                    <Text style={styles.addPhotoText}>
                      {profilePhotos.length === 0 ? 'Add Photo' : 'Add Photo'}
                    </Text>
                    <Text style={styles.addPhotoCount}>{profilePhotos.length}/3</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.profileAge}>{profile.age} years old</Text>

          {editing ? (
            <View style={styles.locationSection}>
              <View style={styles.locationInputRow}>
                <MapPin size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.locationInput}
                  value={location}
                  onChangeText={makeChangeHandler(setLocation)}
                  placeholder="Your location"
                  placeholderTextColor="#6B7280"
                />
              </View>
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={styles.detectButton}
                  onPress={handleDetectLocation}
                  disabled={detectingLocation}
                >
                  {detectingLocation ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <>
                      <Navigation size={14} color="#3B82F6" />
                      <Text style={styles.detectButtonText}>Detect Location</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            profile.location ? (
              <View style={styles.locationContainer}>
                <MapPin size={16} color="#9CA3AF" />
                <Text style={styles.locationText}>{profile.location}</Text>
              </View>
            ) : null
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Looking For</Text>
          {editing ? (
            <TextInput
              style={styles.lookingForInput}
              value={lookingFor}
              onChangeText={makeChangeHandler(setLookingFor)}
              placeholder="e.g. fun tonight, casual dates, friends first..."
              placeholderTextColor="#6B7280"
              maxLength={80}
            />
          ) : (
            <Text style={styles.aboutText}>
              {profile.looking_for || 'Not specified.'}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relationship Status</Text>
          <View style={styles.tagsContainer}>
            {RELATIONSHIP_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.tag, relationshipStatus === status && styles.tagActive]}
                onPress={() => editing && setRelationshipStatus(relationshipStatus === status ? null : status)}
                activeOpacity={editing ? 0.7 : 1}
              >
                <Text style={[styles.tagText, relationshipStatus === status && styles.tagTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!editing && !relationshipStatus && (
            <Text style={styles.aboutText}>Not specified.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          {editing ? (
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={makeChangeHandler(setBio)}
              placeholder="Tell others about yourself..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.aboutText}>
              {profile.bio || 'No bio yet. Tap the settings icon to add one.'}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.tagsContainer}>
            {(editing ? INTERESTS : selectedInterests.length > 0 ? selectedInterests : INTERESTS).map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[styles.tag, (editing ? selectedInterests.includes(interest) : true) && styles.tagActive]}
                onPress={() => editing && toggleInterest(interest)}
                activeOpacity={editing ? 0.7 : 1}
              >
                <Text style={[styles.tagText, (editing ? selectedInterests.includes(interest) : true) && styles.tagTextActive]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Position & Identity</Text>
          <View style={styles.tagsContainer}>
            {POSITIONS.map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[styles.tag, selectedPositions.includes(pos) && styles.tagActive]}
                onPress={() => editing && togglePosition(pos)}
                activeOpacity={editing ? 0.7 : 1}
              >
                <Text style={[styles.tagText, selectedPositions.includes(pos) && styles.tagTextActive]}>
                  {pos}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <ShieldCheck size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Sexual Health</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            This information is optional and visible on your profile.
          </Text>

          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>HIV Status</Text>
            <View style={styles.hivToggle}>
              <TouchableOpacity
                style={[styles.hivOption, hivStatus === 'negative' && styles.hivOptionNegative]}
                onPress={() => editing && setHivStatus(hivStatus === 'negative' ? null : 'negative')}
                activeOpacity={editing ? 0.7 : 1}
              >
                <Text style={[styles.hivOptionText, hivStatus === 'negative' && styles.hivOptionTextActive]}>
                  Negative
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.hivOption, hivStatus === 'positive' && styles.hivOptionPositive]}
                onPress={() => editing && setHivStatus(hivStatus === 'positive' ? null : 'positive')}
                activeOpacity={editing ? 0.7 : 1}
              >
                <Text style={[styles.hivOptionText, hivStatus === 'positive' && styles.hivOptionTextActive]}>
                  Positive
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.hivOption, hivStatus === 'undetectable' && styles.hivOptionUndetectable]}
                onPress={() => editing && setHivStatus(hivStatus === 'undetectable' ? null : 'undetectable')}
                activeOpacity={editing ? 0.7 : 1}
              >
                <Text style={[styles.hivOptionText, hivStatus === 'undetectable' && styles.hivOptionTextActive]}>
                  U=U
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.healthCheckRow}
            onPress={() => editing && setOnPrep(!onPrep)}
            activeOpacity={editing ? 0.7 : 1}
          >
            <View style={[styles.healthCheckbox, onPrep && styles.healthCheckboxOn]}>
              {onPrep && <Check size={14} color="#FFFFFF" />}
            </View>
            <View style={styles.healthCheckContent}>
              <Text style={styles.healthCheckLabel}>On PrEP</Text>
              <Text style={styles.healthCheckDesc}>Pre-exposure prophylaxis for HIV prevention</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.healthCheckRow}
            onPress={() => editing && setNoStis(!noStis)}
            activeOpacity={editing ? 0.7 : 1}
          >
            <View style={[styles.healthCheckbox, noStis && styles.healthCheckboxOn]}>
              {noStis && <Check size={14} color="#FFFFFF" />}
            </View>
            <View style={styles.healthCheckContent}>
              <Text style={styles.healthCheckLabel}>No STIs</Text>
              <Text style={styles.healthCheckDesc}>Self-reported no current sexually transmitted infections</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Last Tested</Text>
            {editing ? (
              <TextInput
                style={styles.dateInput}
                value={lastTestedAt}
                onChangeText={makeChangeHandler(setLastTestedAt)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                maxLength={10}
              />
            ) : (
              <Text style={styles.healthValue}>
                {lastTestedAt || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        {!editing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bugReportButton} onPress={() => setShowBugReport(true)}>
              <Bug size={20} color="#3B82F6" />
              <Text style={styles.bugReportButtonText}>Report a Bug</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BugReportModal visible={showBugReport} onClose={() => setShowBugReport(false)} />
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
    paddingHorizontal: 32,
    gap: 12,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutFallbackButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  signOutFallbackText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconButton: {
    padding: 8,
  },
  blockedWordBanner: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  blockedWordBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
  },
  saveButtonDisabled: {
    backgroundColor: '#1E3A5F',
    opacity: 0.6,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signOutButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  photoThumbContainer: {
    position: 'relative',
  },
  photoThumb: {
    width: 96,
    height: 128,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  primaryBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(59,130,246,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '700',
    overflow: 'hidden',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(239,68,68,0.85)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 96,
    height: 128,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(59,130,246,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '600',
  },
  addPhotoCount: {
    color: '#6B7280',
    fontSize: 10,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#3B82F6',
    paddingVertical: 4,
    textAlign: 'center',
    marginBottom: 4,
    minWidth: 160,
  },
  profileAge: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  locationSection: {
    alignItems: 'center',
    gap: 8,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#3B82F6',
    paddingVertical: 4,
  },
  locationInput: {
    fontSize: 14,
    color: '#9CA3AF',
    minWidth: 140,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
    minHeight: 32,
    minWidth: 140,
    justifyContent: 'center',
  },
  detectButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 16,
    color: '#D1D5DB',
    lineHeight: 24,
  },
  lookingForInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  bioInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: '#374151',
    textAlignVertical: 'top',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  tagActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#3B82F6',
  },
  tagText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  tagTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  healthLabel: {
    fontSize: 15,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  healthValue: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  hivToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  hivOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1F2937',
  },
  hivOptionNegative: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  hivOptionPositive: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  hivOptionUndetectable: {
    backgroundColor: '#1E3A5F',
    borderColor: '#3B82F6',
  },
  hivOptionText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  hivOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  healthCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    gap: 12,
  },
  healthCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#374151',
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  healthCheckboxOn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  healthCheckContent: {
    flex: 1,
  },
  healthCheckLabel: {
    fontSize: 15,
    color: '#D1D5DB',
    fontWeight: '500',
    marginBottom: 2,
  },
  healthCheckDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  dateInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
    minWidth: 120,
    textAlign: 'center',
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bugReportButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  bugReportButtonText: {
    color: '#3B82F6',
    fontSize: 15,
    fontWeight: '600',
  },
});
