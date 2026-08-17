import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Rota raiz: existe só para dar um destino a `/`.
 *
 * Quem decide para onde ir é o guard em `_layout`, que reage ao estado de
 * autenticação. Sem esta tela o expo-router mostraria "Unmatched Route" no
 * primeiro frame, antes de o redirecionamento acontecer.
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
