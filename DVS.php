<?php
function validate_parse(&$rule_string, $stack_level = 0) : array {
	if ( $stack_level != 0 ) {
		$stack_level ++;
		if ( $stack_level == 0 and ( $rule_string[0] == '(' and $rule_string[strlen($rule_string)-1] == ')' or $rule_string[0] == "'" and $rule_string[strlen($rule_string)-1] == "'") )
			$rule_string = substr($rule_string, 1, strlen($rule_string)-2);
		else throw new Exception("Validation Rule Syntax Error: Invalid Stack Level");
	}
	$rule_string = trim($rule_string);
	$rules = array();
	$i = 0;
	$str_escape = false;
	while ( $i < strlen($rule_string) ) {
		switch ( $rule_string[$i] ) {
			case " ": case "\t": case "\n": case "\r":
				if ( $str_escape ) break;
				if ( $stack_level == 0 ) {
					array_push($rules, trim(substr($rule_string, 0, $i)));
					$rule_string = trim(substr($rule_string, $i, strlen($rule_string)-$i));
					$i = -1;
				}
				break;
			case "(":
				if ( $str_escape ) break;
				$stack_level ++;
				break;
			case ")":
				if ( $str_escape ) break;
				$stack_level --;
				if ( $stack_level == 0 ) {
					array_push($rules, trim(substr($rule_string, 0, $i+1)));
					$rule_string = trim(substr($rule_string, $i+1, strlen($rule_string)-$i));
					$i = -1;
				}
				break;
			case "\\":
				if ( in_array($rule_string[$i+1], [ "'", "(", ")" ]) )
					$rule_string = trim(substr($rule_string, 0, $i) . substr($rule_string, $i+1, strlen($rule_string)-$i));
				break;
			case "'":
				$str_escape = !$str_escape;
				if ( $str_escape )
					$stack_level ++;
				else
					$stack_level --;
				break;
		}
		$i ++;
		if ( $stack_level < 0 )
			throw new Exception("Validation Rule Syntax Error: Negative Stack Level");
	}
	if ( strlen($rule_string) )
		array_push($rules, $rule_string);
	if ( $stack_level )
		throw new Exception("Validation Rule Syntax Error: Stack not empty");
	return array_reverse($rules);
}



function validate_eval(array &$command, array $test) {
	$cmd = array_pop($command);
	switch ( $cmd ) {
		case "WHEN":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			if ( $x )
				return $y;
			else
				return true;
		case "OR":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x or $y;
		case "AND":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x and $y;
		case "NOT":
			return !validate_eval($command, $test);
		case "SET":
			try {
				validate_eval($command, $test);
				return true;
			}
			catch ( Exception $e ) {
				return false;
			}
		case "EMPTY":
			try {
				$val = validate_eval($command, $test);
				return empty($val);
			}
			catch ( Exception $e ) {
				return true;
			}
			return empty($test[$arg]);
		case "ERROR":
			$error = validate_eval($command, $test);
			$valid = validate_eval($command, $test);
			return $valid;
		case "ANY":
			$cmd_any = array_pop($command);
			$cmd_any = validate_parse($cmd_any, -1);
			$fields = array_pop($command);
			$fields = validate_parse($fields, -1);
			$valid = false;
			while ( $fields ) {
				$fields = array_merge($fields, $cmd_any);
				$valid |= validate_eval($fields, $test);
			}
			return $valid;
		case "ALL":
			$cmd_all = array_pop($command);
			$cmd_all = validate_parse($cmd_all, -1);
			$fields = array_pop($command);
			$fields = validate_parse($fields, -1);
			$valid = true;
			while ( $fields ) {
				$fields = array_merge($fields, $cmd_all);
				$valid &= validate_eval($fields, $test);
			}
			return $valid;
		case "MATCH":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			$valid = preg_match("/$x/", $y);
			return $valid;
		case "BETWEEN":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			$z = validate_eval($command, $test);
			return $x <= $z and $z <= $y;
		case ">":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x > $y;
		case "<":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x < $y;
		case "==":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x == $y;
		case ">=":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x >= $y;
		case "<=":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x <= $y;
		case "SUM":
			$fields = array_pop($command);
			$fields = validate_parse($fields, -1);
			$value = 0;
			while ( $fields )
				$valid += validate_eval($fields, $test);
			return $valid;
		case "+":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x + $y;
		case "-":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x - $y;
		case "*":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x * $y;
		case "/":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x / $y;
		case "%":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x % $y;
		case "**":
			$x = validate_eval($command, $test);
			$y = validate_eval($command, $test);
			return $x ** $y;
		default:
			if ( is_numeric($cmd) )
				return $cmd;
			if ( $cmd[0] == "'" and $cmd[strlen($cmd)-1] == "'" )
				return substr($cmd, 1, strlen($cmd)-2);
			if ( $cmd[0] == "(" and $cmd[strlen($cmd)-1] == ")" ) {
				$cmd = validate_parse($cmd, -1);
				return validate_eval($cmd, $test);
			}
			if ( isset($test[$cmd]) )
				return $test[$cmd];
			throw new Exception("Validate could not process: " . var_export($cmd, true));
	}
}



function validate(string $rule_string, array $test) {
	$valid = true;
	$command = validate_parse($rule_string);
	while ( $command )
		$valid &= validate_eval($command, $test);
	return $valid;
} ?>