// Package calculator contains the pure arithmetic domain logic.
// It knows nothing about HTTP or JSON so it can be tested in isolation.
package calculator

import (
	"errors"
	"math"
)

// Operation identifies an arithmetic operation.
type Operation string

const (
	Add      Operation = "add"
	Subtract Operation = "subtract"
	Multiply Operation = "multiply"
	Divide   Operation = "divide"
	Power    Operation = "power"
	Sqrt     Operation = "sqrt"
	Percent  Operation = "percent"
)

// Sentinel errors let callers branch with errors.Is.
var (
	ErrUnknownOperation = errors.New("unknown operation")
	ErrMissingOperand   = errors.New("operation requires a second operand")
	ErrDivisionByZero   = errors.New("division by zero")
	ErrNegativeSqrt     = errors.New("square root of a negative number")
	ErrNotRepresentable = errors.New("result is not a finite number")
)

// Calculate applies operation to the operands. secondOperand is nil for sqrt
// and is ignored for it. The result is guaranteed to be finite on success, so
// it can always be serialised to JSON (which has no NaN/Inf).
func Calculate(operation Operation, firstOperand float64, secondOperand *float64) (float64, error) {
	result, err := apply(operation, firstOperand, secondOperand)
	if err != nil {
		return 0, err
	}

	// Catches overflow (1e308*10), 0^-1 and (-8)^0.5, which all yield Inf/NaN.
	if math.IsNaN(result) || math.IsInf(result, 0) {
		return 0, ErrNotRepresentable
	}
	return result, nil
}

// apply performs the operation itself, without checking that the result is finite.
func apply(operation Operation, firstOperand float64, secondOperand *float64) (float64, error) {
	if operation == Sqrt {
		if firstOperand < 0 {
			return 0, ErrNegativeSqrt
		}
		return math.Sqrt(firstOperand), nil
	}

	if !isKnown(operation) {
		return 0, ErrUnknownOperation
	}
	if secondOperand == nil {
		return 0, ErrMissingOperand
	}
	secondValue := *secondOperand

	switch operation {
	case Add:
		return firstOperand + secondValue, nil
	case Subtract:
		return firstOperand - secondValue, nil
	case Multiply:
		return firstOperand * secondValue, nil
	case Divide:
		if secondValue == 0 {
			return 0, ErrDivisionByZero
		}
		return firstOperand / secondValue, nil
	case Power:
		return math.Pow(firstOperand, secondValue), nil
	default: // Percent: "firstOperand percent of secondOperand", e.g. 15% of 200 = 30.
		return firstOperand / 100 * secondValue, nil
	}
}

func isKnown(operation Operation) bool {
	switch operation {
	case Add, Subtract, Multiply, Divide, Power, Percent:
		return true
	}
	return false
}
