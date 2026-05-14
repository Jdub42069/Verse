import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

interface ProfileForVerification {
  id: string;
  name: string;
  age: number;
  avatar_url: string | null;
  photo_verification_status: string;
  photo_rejection_reason: string | null;
  created_at: string;
}

export default function AdminScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileForVerification[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminAccess();
  }, [profile]);

  useEffect(() => {
    if (user && !loading) {
      loadProfiles();
    }
  }, [filter, user, loading]);

  const checkAdminAccess = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Double-check admin status directly from database
    const { data: dbProfile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !dbProfile?.is_admin) {
      setLoading(false);
      Alert.alert('Access Denied', 'You do not have admin privileges', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
      return;
    }

    setLoading(false);
  };

  const loadProfiles = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, name, age, avatar_url, photo_verification_status, photo_rejection_reason, created_at')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('photo_verification_status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;
      setProfiles(data || []);
    } catch {
      Alert.alert('Error', 'Failed to load profiles. Please try again.');
    }
  };

  const handleVerification = async (
    profileId: string,
    action: 'approved' | 'rejected',
    reason?: string
  ) => {
    if (!user) return;

    setProcessing(profileId);
    try {
      const previousStatus =
        profiles.find((p) => p.id === profileId)?.photo_verification_status || 'pending';

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          photo_verified: action === 'approved',
          photo_verification_status: action,
          photo_rejection_reason: action === 'rejected' ? reason : null,
          photo_verified_at: new Date().toISOString(),
          photo_verified_by: user.id,
        })
        .eq('id', profileId);

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('photo_verification_log').insert({
        profile_id: profileId,
        admin_id: user.id,
        action,
        reason: action === 'rejected' ? reason : null,
        previous_status: previousStatus,
        new_status: action,
      });

      if (logError) throw logError;

      Alert.alert('Success', `Profile photo ${action} successfully`);
      await loadProfiles();
    } catch {
      Alert.alert('Error', 'Failed to update verification status. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const promptReject = (profileId: string) => {
    Alert.prompt(
      'Reject Photo',
      'Please provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: (reason) => {
            if (reason && reason.trim()) {
              handleVerification(profileId, 'rejected', reason.trim());
            } else {
              Alert.alert('Error', 'Please provide a reason for rejection');
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const filteredProfiles = profiles.filter((p) =>
    !searchQuery ||
    String(p.age).includes(searchQuery) ||
    (p.location ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  // Remove this check since checkAdminAccess handles it
  // if (!profile?.is_admin) {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <View style={styles.loadingContainer}>
  //         <Text style={styles.errorText}>Access Denied</Text>
  //         <Text style={styles.errorSubtext}>You do not have admin privileges</Text>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={loadProfiles} style={styles.refreshButton}>
          <RefreshCw size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name..."
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending ({profiles.filter((p) => p.photo_verification_status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({profiles.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredProfiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No profiles match your search'
                : filter === 'pending'
                  ? 'No pending verifications'
                  : 'No profiles found'}
            </Text>
          </View>
        ) : (
          filteredProfiles.map((profile) => (
            <View key={profile.id} style={styles.profileCard}>
              <Image
                source={{
                  uri:
                    profile.avatar_url ||
                    'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400&h=500&fit=crop',
                }}
                style={styles.profileImage}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {profile.age} y/o
                </Text>
                <View style={styles.statusBadge}>
                  <Text
                    style={[
                      styles.statusText,
                      profile.photo_verification_status === 'approved' && styles.statusApproved,
                      profile.photo_verification_status === 'rejected' && styles.statusRejected,
                    ]}
                  >
                    {profile.photo_verification_status.toUpperCase()}
                  </Text>
                </View>
                {profile.photo_rejection_reason && (
                  <Text style={styles.rejectionReason}>
                    Reason: {profile.photo_rejection_reason}
                  </Text>
                )}
              </View>

              {processing === profile.id ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleVerification(profile.id, 'approved')}
                  >
                    <CheckCircle size={20} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => promptReject(profile.id)}
                  >
                    <XCircle size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#374151',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  statusApproved: {
    color: '#10B981',
  },
  statusRejected: {
    color: '#EF4444',
  },
  rejectionReason: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
});
