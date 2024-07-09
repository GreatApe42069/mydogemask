import {
  Box,
  Button,
  Center,
  FlatList,
  Spinner,
  Text,
  VStack,
} from 'native-base';
import { useCallback } from 'react';

import { BigButton } from '../../../components/Button';
import { useCachedInscriptionTxs } from '../../../hooks/useCachedInscriptionTxs';
import { Transaction } from './Transaction';

export const TransactionsTab = ({
  toggleReceiveModal,
  onBuy,
  transactions,
  loading,
  hasMore,
  fetchMore,
  isLoadingMore,
}) => {
  const cachedInscriptions = useCachedInscriptionTxs({ filterPending: false });

  const renderItem = useCallback(
    ({ item }) => (
      <Transaction
        transaction={item}
        cachedInscription={cachedInscriptions.find((inscription) =>
          inscription.txs?.includes(item.id)
        )}
      />
    ),
    [cachedInscriptions]
  );

  return (
    <Box flex={1}>
      {!transactions || (loading && !isLoadingMore) ? (
        <Center pt='40px'>
          <Spinner color='amber.400' />
        </Center>
      ) : transactions.length <= 0 ? (
        <VStack pt='48px' alignItems='center'>
          <Text color='gray.500' pt='24px' pb='32px'>
            No transactions found
          </Text>
          <Text fontSize='16px'>To get started, send DOGE to your wallet</Text>
          <BigButton mt='24px' onPress={onBuy}>
            Buy DOGE
          </BigButton>
          <BigButton mt='18px' onPress={toggleReceiveModal}>
            Deposit DOGE
          </BigButton>
        </VStack>
      ) : (
        <Box px='20px'>
          <VStack space='10px'>
            <FlatList
              data={transactions}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
            />
            {hasMore ? (
              <Button
                variant='unstyled'
                my='12px'
                _hover={{ bg: 'gray.200' }}
                alignSelf='center'
                bg='gray.100'
                onPress={fetchMore}
                isDisabled={loading}
                alignItems='center'
              >
                <Text color='gray.500' alignItems='center'>
                  View more
                  {isLoadingMore ? (
                    <Spinner
                      color='amber.400'
                      pl='8px'
                      transform={[{ translateY: 4 }]}
                    />
                  ) : null}
                </Text>
              </Button>
            ) : null}
          </VStack>
        </Box>
      )}
    </Box>
  );
};
