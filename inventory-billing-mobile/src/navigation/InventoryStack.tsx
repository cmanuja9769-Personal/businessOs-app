import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { InventoryStackParamList } from './types';
import { useTheme } from '@contexts/ThemeContext';
import ItemListScreen from '@screens/inventory/ItemListScreen';
import ItemDetailScreen from '@screens/inventory/ItemDetailScreen';
import AddItemScreen from '@screens/inventory/AddItemScreen';
import StockAdjustmentScreen from '@screens/inventory/StockAdjustmentScreen';

const Stack = createStackNavigator<InventoryStackParamList>();

export default function InventoryStack() {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.text,
        },
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="ItemList" 
        component={ItemListScreen}
        options={{ 
          title: 'Inventory',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen 
        name="ItemDetail" 
        component={ItemDetailScreen}
        options={{ title: 'Item Details' }}
      />
      <Stack.Screen 
        name="AddItem" 
        component={AddItemScreen}
        options={{ title: 'Add Item' }}
      />
      <Stack.Screen 
        name="StockAdjustment" 
        component={StockAdjustmentScreen}
        options={{ title: 'Stock Adjustment' }}
      />
    </Stack.Navigator>
  );
}
