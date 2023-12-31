import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryLegend, VictoryTheme, VictoryLabel } from 'victory-native';
import { Dimensions } from 'react-native';
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { auth, database } from '../firebase/firebaseSetup';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from "firebase/firestore";


const windowWidth = Dimensions.get('window').width;

export default function LineChartManager({ selectedMonth }) {

  const [expenseData, setExpenseData] = useState({});
  const [accumulatedExpenseData, setAccumulatedExpenseData] = useState({});
  const [budgetData, setBudgetData] = useState(null);


  const userUid = auth.currentUser.uid;

   // Get budgetLimit
   useEffect(() => {
    const budgetsQuery = query(
      collection(database, 'Budgets'),
      where('user', '==', userUid)
    );

    const unsubscribeBudgets = onSnapshot(budgetsQuery, (budgetSnapshot) => {
      if (!budgetSnapshot.empty) {
        const latestBudget = budgetSnapshot.docs[budgetSnapshot.docs.length - 1].data();
        setBudgetData(latestBudget.limit || 0);
      } else {
        setBudgetData(0);
      }
    });

    return () => {
      unsubscribeBudgets();
    };
  }, [userUid, selectedMonth]);


  useEffect(() => {
    const expensesQuery = query(
      collection(database, 'Expenses'),
      where('user', '==', userUid)
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (expenseSnapshot) => {
      if (!expenseSnapshot.empty) {

      let expenseData = {};
      let accumulatedExpenseData = {};
      let sortedExpenses = [];

      expenseSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.amount && isWithinSelectedMonth(data.date, selectedMonth)) {
              sortedExpenses.push({ date: data.date.toDate(), amount: data.amount });
          }
      });

      sortedExpenses.sort((a, b) => a.date - b.date); 

      let accumulatedExpense = 0;
      sortedExpenses.forEach(({ date, amount }) => {

          accumulatedExpense += amount;
          const key = date.toISOString().slice(5, 10);
          expenseData[key] = amount;
          accumulatedExpenseData[key] = accumulatedExpense;
      });

      setExpenseData(expenseData);
      setAccumulatedExpenseData(accumulatedExpenseData);
    } else {
      setExpenseData({});
      setAccumulatedExpenseData({});
    }
    }, (error) => {
      console.error("Error fetching Firestore documents for user (expense):", error);
    });

    return () => {
      unsubscribeExpenses();
    };
  }, [userUid, selectedMonth]);

    
    // check if expense is within selected month
    const isWithinSelectedMonth = (firebaseTimestamp, selectedMonth) => {
        const date = firebaseTimestamp.toDate();
    
        const year = date.getFullYear();
        const month = date.getMonth() + 1; 
        const formattedMonth = month < 10 ? `0${month}` : `${month}`;
        const dateMonthYear = `${year}-${formattedMonth}`;
    
        return dateMonthYear === selectedMonth;
        }
    
 
        // legend data
        const legendData = [
          { name: "Budget", symbol: { fill: "tomato", type: "star" }, labels: { fill: "tomato" } },
          { name: "Daily Expense", symbol: { fill: "#4c97ff", type: "circle" }, labels: { fill: "#4c97ff" } },
          { name: "Accumulated Expense", symbol: { fill: "#008170", type: "square" }, labels: { fill: "#008170" } },
        ];



    
  return (
    <View style={styles.container}>
        <View style={styles.legendContainer}>
            <VictoryLegend
                x={windowWidth * 0.1}
                y={0}
                orientation="horizontal"
                gutter={20}
                style={{ labels: styles.legendLabels }} 
                data={legendData}
            />
        </View>
        <View style={styles.LineChartContainer}>
            <VictoryChart 
                theme={VictoryTheme.material}
                width={windowWidth} 
                height={windowWidth * 0.45} 
                padding={{ top: 20, bottom: 30, left:65, right: 40 }}
                // animate={{ duration: 50 }}
                >

          {/* X Axis */}
        <VictoryAxis
            tickLabelComponent={
              <VictoryLabel style={{ fontSize: 12 }} />
            }
          />

          {/* Y Axis */}
          { Object.keys(expenseData).length > 1 && (
          <VictoryAxis
            dependentAxis
            tickLabelComponent={
              <VictoryLabel style={{ fontSize: 12 }} />
            }
          />
          )}

            {/* Accumulated Expense Line */}
            <VictoryLine
                animate={{ duration: 100 }}
                data={Object.entries(accumulatedExpenseData).map(([key, value]) => ({ x: key, y: value }))}
                style={{
                data: { stroke: "#008170", strokeWidth: 2 },
                parent: { border: "1px solid #ccc" }
                }}
            />

            {/* Expense Line */}
            <VictoryLine
                animate={{ duration: 100 }}
                data={Object.entries(expenseData).map(([key, value]) => ({ x: key, y: value }))}
                style={{
                data: { stroke: "#4c97ff", strokeWidth: 2 },
                parent: { border: "1px solid #ccc" }
                }}
            />

            {/* Budget Line */}
            {budgetData!=0 && Object.keys(expenseData).length > 0 && (
                (() => {
                const sortedDates = Object.keys(expenseData).sort();
                return (
                    <VictoryLine
                    animate={{ duration: 100 }}
                    data={[
                        { x: sortedDates[0], y: budgetData }, 
                        { x: sortedDates[sortedDates.length - 1], y: budgetData } 
                    ]}
                    style={{
                        data: { stroke: "tomato", strokeWidth: 2 }
                    }}
                    />
                );
                })()
            )}


        </VictoryChart>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column', 
        justifyContent: 'center',
        alignItems: 'center', 
        borderRadius: 18,
        width: '90%', 
        alignSelf: "center",
        backgroundColor: '#FFFBF5',
        padding: 10,
        shadowColor: 'gray',
        shadowOffset: { width: 5, height: 5 }, // Shadow offset
        shadowOpacity: 0.8, // Shadow opacity
        shadowRadius: 8, // Shadow radius
        elevation: 10, // Android shadow elevation
      },
      legendContainer: {
        flex: 0.5, 
        alignItems: 'center', 
        justifyContent: 'center',
        alignSelf: "center",
        marginBottom: 10,
        },
      legendLabels: {
        fill: "black", 
        fontSize: 10.5,
        // fontFamily: "Roboto",
        fontWeight: "bold",
      },
});
