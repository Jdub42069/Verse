import { Tabs } from 'expo-router';
import { MessageCircle, Search, User, Eye } from 'lucide-react-native';
import { View } from 'react-native';
import { AuthGuard } from '@/components/AuthGuard';

export default function TabLayout() {
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1F2937',
            borderTopColor: '#374151',
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Explore',
            tabBarIcon: ({ size, color }) => (
              <Search size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ size, color }) => (
              <View style={{ position: 'relative' }}>
                <MessageCircle size={size} color={color} />
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  backgroundColor: '#EF4444',
                  borderRadius: 4,
                }} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="viewed-me"
          options={{
            title: 'Viewed Me',
            tabBarIcon: ({ size, color }) => (
              <View style={{ position: 'relative' }}>
                <Eye size={size} color={color} />
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  backgroundColor: '#EF4444',
                  borderRadius: 4,
                }} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ size, color }) => (
              <User size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}
