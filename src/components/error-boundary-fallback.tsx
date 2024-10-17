import React from 'react';
import { Button, Text, View, StyleSheet } from 'react-native';

export function ErrorBoundaryFallback(props: {
  error: Error;
  resetError: Function;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oops! Something went wrong</Text>
      <Text style={styles.errorText}>
        An unexpected error occurred. Please try again.
      </Text>
      <Button title="Retry" onPress={() => props.resetError()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
    textAlign: 'center',
  },
});
