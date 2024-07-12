import {
  AlertDialog,
  Box,
  Button,
  Center,
  HStack,
  Modal,
  Popover,
  Pressable,
  Spinner,
  Text,
  Toast,
  VStack,
} from 'native-base';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaLink } from 'react-icons/fa';

import { BigButton } from '../../components/Button';
import { OriginBadge } from '../../components/OriginBadge';
import { RecipientAddress } from '../../components/RecipientAddress';
import { ToastRender } from '../../components/ToastRender';
import { WalletAddress } from '../../components/WalletAddress';
import { DISPATCH_TYPES } from '../../Context';
import { MESSAGE_TYPES } from '../../scripts/helpers/constants';
import { sendMessage } from '../../scripts/helpers/message';
import {
  decodeRawPsbt,
  getAmountFromRawPsbt,
} from '../../scripts/helpers/wallet';

export function ClientPSBT({ params, dispatch, connectedClient }) {
  const { originTabId, origin, rawTx, selectedAddressIndex, indexes } = params;

  console.log('rawTx', rawTx, 'indexes', indexes);

  const handleWindowClose = useCallback(() => {
    dispatch({ type: DISPATCH_TYPES.CLEAR_CLIENT_REQUEST });
  }, [dispatch]);

  const [psbt, setPsbt] = useState(null);

  useEffect(() => {
    try {
      setPsbt(decodeRawPsbt(rawTx));
    } catch (error) {
      handleFailedTransaction({
        title: 'Error',
        description: 'Invalid PSBT',
      });
    }
  }, [handleFailedTransaction, rawTx]);

  const inputs = psbt?.txInputs?.map((input, index) => {
    return {
      inputIndex: index,
      txid: input.hash.toString('hex'),
      vout: input.index,
    };
  });

  const outputs = psbt?.txOutputs?.map((output, index) => {
    return {
      outputIndex: index,
      address: output.address,
      value: output.value,
    };
  });

  const { amount: dogeAmount } = getAmountFromRawPsbt(rawTx);

  const recipientAddress = outputs?.[0]?.address;

  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);

  const onCloseModal = useCallback(() => {
    setConfirmationModalOpen(false);
  }, []);

  const handleFailedTransaction = useCallback(
    ({
      title = 'Transaction Failed',
      description = 'Error creating transaction',
    }) => {
      setLoading(false);
      sendMessage(
        {
          message: MESSAGE_TYPES.CLIENT_REQUEST_PSBT_RESPONSE,
          data: { error: description, originTabId, origin },
        },
        () => {
          Toast.show({
            duration: 3000,
            render: () => {
              return (
                <ToastRender
                  title={title}
                  description={description}
                  status='error'
                />
              );
            },
          });
          handleWindowClose();
        },
        []
      );
    },
    [handleWindowClose, origin, originTabId]
  );

  const onRejectTransaction = useCallback(() => {
    sendMessage(
      {
        message: MESSAGE_TYPES.CLIENT_REQUEST_PSBT_RESPONSE,
        data: { error: 'User refused transaction', originTabId, origin },
      },
      () => {
        Toast.show({
          duration: 3000,
          render: () => {
            return (
              <ToastRender
                title='Transaction Rejected'
                description={`MyDoge failed to authorize the transaction to ${origin}`}
                status='error'
              />
            );
          },
        });
        handleWindowClose();
      },
      []
    );
  }, [handleWindowClose, origin, originTabId]);

  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(async () => {
    setLoading(true);
    sendMessage(
      {
        message: MESSAGE_TYPES.SIGN_PSBT,
        data: { rawTx, indexes: [indexes].flat(), selectedAddressIndex },
      },
      ({ rawTx: signedRawTx, fee, amount }) => {
        if (signedRawTx && fee && amount) {
          sendMessage(
            {
              message: MESSAGE_TYPES.SEND_PSBT,
              data: { rawTx: signedRawTx, selectedAddressIndex },
            },
            (txId) => {
              setLoading(false);
              if (txId) {
                sendMessage(
                  {
                    message: MESSAGE_TYPES.CLIENT_REQUEST_PSBT_RESPONSE,
                    data: { txId, originTabId, origin },
                  },
                  () => {
                    Toast.show({
                      duration: 3000,
                      render: () => {
                        return (
                          <ToastRender
                            description='Transaction Sent'
                            status='success'
                          />
                        );
                      },
                    });
                    handleWindowClose();
                  }
                );
              } else {
                handleFailedTransaction({
                  title: 'Error',
                  description: 'Failed to send transaction.',
                });
              }
            }
          );
        } else {
          handleFailedTransaction({
            title: 'Error',
            description: 'Unable to create psbt transaction',
          });
        }
      }
    );
  }, [
    handleFailedTransaction,
    handleWindowClose,
    indexes,
    origin,
    originTabId,
    rawTx,
    selectedAddressIndex,
  ]);

  if (!psbt) {
    return null;
  }

  return (
    <>
      <Box p='8px' bg='brandYellow.500' rounded='full' my='16px'>
        <FaLink />
      </Box>
      <Text fontSize='2xl'>
        Confirm <Text fontWeight='bold'>Transaction</Text>
      </Text>
      <Center pt='16px' w='300px'>
        <WalletAddress address={connectedClient.address} />
        <Text fontSize='lg' pb='4px' textAlign='center' fontWeight='semibold'>
          Sign PSTB
        </Text>
        <OriginBadge origin={origin} mt='12px' mb='10px' />
        <RecipientAddress address={outputs[0].address} />
        <HStack pb='20px' justifyContent='center' space='16px' mt='-10px'>
          {inputs?.length ? (
            <Popover
              trigger={(triggerProps) => {
                return (
                  <Pressable {...triggerProps}>
                    <HStack>
                      <Text
                        fontSize='14px'
                        fontWeight='semibold'
                        color='gray.400'
                        underline={{ textDecorationLine: 'underline' }}
                      >
                        Inputs ({inputs.length})
                      </Text>
                    </HStack>
                  </Pressable>
                );
              }}
            >
              <Popover.Content>
                <Popover.Arrow />
                <Popover.Body>
                  <VStack space='16px'>
                    {inputs.map(({ inputIndex, txid, vout }) => (
                      <VStack
                        alignItems='flex-start'
                        justifyContent='flex-start'
                        w='300px'
                        key={inputIndex}
                      >
                        <Text
                          fontSize='14px'
                          fontWeight='bold'
                          paddingBottom='10px'
                        >
                          Input Index {inputIndex}
                        </Text>
                        <VStack>
                          <Text
                            fontSize='10px'
                            fontWeight='medium'
                            color='gray.600'
                          >
                            Transaction ID
                          </Text>
                          <Text
                            fontSize='12px'
                            fontWeight='medium'
                            color='gray.600'
                            width='300px'
                          >
                            {txid}
                          </Text>
                        </VStack>
                        <VStack>
                          <Text
                            fontSize='10px'
                            fontWeight='medium'
                            color='gray.500'
                          >
                            Vout
                          </Text>
                          <Text
                            fontSize='12px'
                            fontWeight='medium'
                            color='gray.700'
                          >
                            {vout}
                          </Text>
                        </VStack>
                      </VStack>
                    ))}
                  </VStack>
                </Popover.Body>
              </Popover.Content>
            </Popover>
          ) : null}
          {outputs?.length ? (
            <Popover
              trigger={(triggerProps) => {
                return (
                  <Pressable {...triggerProps}>
                    <HStack>
                      <Text
                        fontSize='14px'
                        fontWeight='semibold'
                        color='gray.400'
                        underline={{ textDecorationLine: 'underline' }}
                      >
                        Outputs ({outputs.length})
                      </Text>
                    </HStack>
                  </Pressable>
                );
              }}
            >
              <Popover.Content>
                <Popover.Arrow />
                <Popover.Body>
                  <VStack space='16px'>
                    {outputs.map(({ outputIndex, address, value }) => (
                      <VStack
                        alignItems='flex-start'
                        justifyContent='flex-start'
                        w='300px'
                        key={outputIndex}
                      >
                        <Text
                          fontSize='14px'
                          fontWeight='bold'
                          paddingBottom='6px'
                        >
                          Output Index {outputIndex}
                        </Text>
                        <VStack>
                          <Text
                            fontSize='10px'
                            fontWeight='medium'
                            color='gray.600'
                          >
                            Address:{' '}
                          </Text>
                          <Text
                            fontSize='12px'
                            fontWeight='medium'
                            color='gray.600'
                            width='300px'
                          >
                            {address}
                          </Text>
                        </VStack>
                        <VStack>
                          <Text
                            fontSize='10px'
                            fontWeight='medium'
                            color='gray.600'
                          >
                            Value
                          </Text>
                          <Text
                            fontSize='12px'
                            fontWeight='medium'
                            color='gray.600'
                          >
                            {value}
                          </Text>
                        </VStack>
                      </VStack>
                    ))}
                  </VStack>
                </Popover.Body>
              </Popover.Content>
            </Popover>
          ) : null}
        </HStack>

        <Text fontSize='3xl' fontWeight='semibold' pt='6px'>
          Ð{dogeAmount}
        </Text>
        {/* <Text fontSize='13px' fontWeight='semibold' pt='6px'>
          Network fee Ð{fee}
        </Text> */}
        <HStack alignItems='center' mt='60px' space='12px'>
          <BigButton
            onPress={onRejectTransaction}
            variant='secondary'
            px='20px'
          >
            Cancel
          </BigButton>
          <BigButton
            onPress={() => setConfirmationModalOpen(true)}
            type='submit'
            role='button'
            px='28px'
          >
            Pay
          </BigButton>
        </HStack>
      </Center>
      <ConfirmationModal
        showModal={confirmationModalOpen}
        onClose={onCloseModal}
        origin={origin}
        onSubmit={onSubmit}
        loading={loading}
        recipientAddress={recipientAddress}
        dogeAmount={dogeAmount}
      />
    </>
  );
}

const ConfirmationModal = ({
  showModal,
  onClose,
  origin,
  onSubmit,
  loading,
  dogeAmount,
  recipientAddress,
}) => {
  const cancelRef = useRef();

  return (
    <>
      <Modal isOpen={loading} full>
        <Modal.Body h='600px' justifyContent='center'>
          <Spinner size='lg' />
        </Modal.Body>
      </Modal>
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={showModal}
        onClose={onClose}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Confirm Transaction</AlertDialog.Header>
          <AlertDialog.Body alignItems='center'>
            <OriginBadge origin={origin} mb='8px' />
            <RecipientAddress address={recipientAddress} />
            <VStack alignItems='center'>
              <Text>
                Confirm transaction to send{' '}
                <Text fontWeight='bold'>Ð{dogeAmount}</Text>
              </Text>
            </VStack>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant='unstyled'
                colorScheme='coolGray'
                onPress={onClose}
                ref={cancelRef}
                disabled={loading}
              >
                Cancel
              </Button>
              <BigButton onPress={onSubmit} px='24px' loading={loading}>
                Confirm
              </BigButton>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </>
  );
};
