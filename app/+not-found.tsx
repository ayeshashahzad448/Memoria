import { Link, Stack } from 'expo-router';
import { Text } from 'heroui-native';
import { View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Lost in space' }} />
      <View className="bg-void flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-starlight text-xl font-semibold">This star drifted away.</Text>
        <Link href="/cosmos">
          <Text className="text-accent">Return to your cosmos</Text>
        </Link>
      </View>
    </>
  );
}
