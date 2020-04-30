function validate_parse(rule_string, stack_level=0) {
	if ( stack_level != 0 ) {
		stack_level ++;
		if ( stack_level == 0 & ( rule_string[0] == '(' && rule_string[rule_string.length-1] == ')' || rule_string[0] == "'" && rule_string[rule_string.length-1] == "'") )
			rule_string = rule_string.substring(1, rule_string.length-1);
		else throw "Validation Rule Syntax Error: Invalid Stack Level";
	}
	rule_string = rule_string.trim();
	rules = [];
	i = 0;
	str_escape = false;
	while ( i < rule_string.length ) {
		switch ( rule_string[i] ) {
			case " ": case "\t": case "\n": case "\r":
				if ( str_escape ) break;
				if ( stack_level == 0 ) {
					rules.push(rule_string.substring(0, i).trim());
					rule_string = rule_string.substring(i+1).trim();
					i = -1;
				}
				break;
			case "(":
				if ( str_escape ) break;
				stack_level ++;
				break;
			case ")":
				if ( str_escape ) break;
				stack_level --;
				if ( stack_level == 0 ) {
					rules.push(rule_string.substring(0, i+1).trim());
					rule_string = rule_string.substring(i+1).trim();
					i = -1;
				}
				break;
			case "\\":
				if ( ["'", "(", ")"].includes(rule_string[i+1]) ) {
					rule_string = (rule_string.substring(0, i) + rule_string.substring(i+1)).trim();
				}
				break;
			case "'":
				str_escape = !str_escape;
				if ( str_escape )
					stack_level ++;
				else
					stack_level --;
				break;
		}
		i ++;
		if ( stack_level < 0 )
			throw "Validation Rule Syntax Error: Negative Stack Level";
	}
	if ( rule_string.length )
		rules.push(rule_string);
	if ( stack_level )
		throw "Validation Rule Syntax Error: Stack not empty";
	return rules.reverse();
}

function validate_eval(command, test, is_form=false, report="", invert=false, custom_error="") {
	var cmd = command.pop();
	var command_stack = command.slice(0);
	switch ( cmd ) {
		case "OR":
			var x = validate_eval(command, test, is_form, report, invert, custom_error);
			var y = validate_eval(command, test, is_form, report, invert, custom_error);
			var r = x || y;
			return r;
		case "AND":
			var x = validate_eval(command, test, is_form, report, invert, custom_error);
			var y = validate_eval(command, test, is_form, report, invert, custom_error);
			var r = x && y;
			return r;
		case "NOT":
			var r = !validate_eval(command, test, is_form);
			if ( invert != !r && is_form && report )
				validate_eval(command_stack, test, is_form, report + " NOT", !invert, custom_error);
			return r;
		case "SET":
			var r;
			try {
				validate_eval(command, test, is_form);
				r = true;
			}
			catch(err) {
				r = false;
			}
			if ( invert != !r && is_form && report ) {
				try {
					validate_eval(command_stack, test, is_form, report + " BE SET", invert, custom_error);
				}
				catch(err) {
				}
			}
			return r;
		case "EMPTY":
			var r;
			try {
				var val = validate_eval(command, test, is_form);
				r = val == undefined || val == null || val == false || val == [] || val == 0 || val == "" || val == "0";
			}
			catch ( err ) {
				r = true;
			}
			if ( invert != !r && is_form && report ) {
				var r;
				try {
					validate_eval(command_stack, test, is_form, report + " BE EMPTY", invert, custom_error);
				}
				catch ( err ) {
				}
			}
			return r;
		case "ERROR":
			var error = validate_eval(command, test, is_form, report, invert, custom_error);
			var valid = validate_eval(command, test, is_form, report, invert, custom_error);
			if ( !valid ) {
				validate_eval(command_stack, test, is_form, report, invert, custom_error);
				validate_eval(command_stack, test, is_form, report, invert, error);
			}
			return valid;
		case "ANY":
			var cmd_any = command.pop();
			cmd_any = validate_parse(cmd_any, -1);
			var fields = command.pop();
			fields = validate_parse(fields, -1);
			var valid = false;
			while ( fields.length ) {
				fields = fields.concat(cmd_any);
				valid |= validate_eval(fields, test, is_form, report, invert, custom_error);
			}
			return valid;
		case "ALL":
			var cmd_all = command.pop();
			cmd_all = validate_parse(cmd_all, -1);
			var fields = command.pop();
			fields = validate_parse(fields, -1);
			var valid = true;
			while ( fields.length ) {
				fields = fields.concat(cmd_all);
				valid &= validate_eval(fields, test, is_form, report, invert, custom_error);
			}
			return valid;
		case "MATCH":
			var x = validate_eval(command, test);
			x = new RegExp(x);
			var y = validate_eval(command, test, is_form);
			var valid = x.test(y);
			if ( invert != !valid && is_form && report ) {
				validate_eval(command_stack, test, is_form, report + " MATCH PATTERN: " + x, invert, custom_error);
				validate_eval(command_stack, test, is_form, report + " MATCH PATTERN: " + x, invert, custom_error);
			}
			return valid;
		case "BETWEEN":
			var x = validate_eval(command, test, is_form);
			var y = validate_eval(command, test, is_form);
			var z = validate_eval(command, test, is_form);
			var r = x <= z && z <= y;
			if ( invert != !r && is_form && report ) {
				validate_eval(command_stack, test, is_form, z + " " + report + " BE BETWEEN " + x + " AND " + y, invert, custom_error);
				validate_eval(command_stack, test, is_form, z + " " + report + " BE BETWEEN " + x + " AND " + y, invert, custom_error);
				validate_eval(command_stack, test, is_form, z + " " + report + " BE BETWEEN " + x + " AND " + y, invert, custom_error);
			}
			return r;
		case ">":
			var x = validate_eval(command, test, is_form);
			var y = validate_eval(command, test, is_form);
			var r = x > y;
			if ( invert != !r && is_form && report ) {
				validate_eval(command_stack, test, is_form, x + " " + report + " BE GREATOR THAN " + y, invert, custom_error);
				validate_eval(command_stack, test, is_form, x + " " + report + " BE GREATOR THAN " + y, invert, custom_error);
			}
			return r;
		case "<":
			var x = validate_eval(command, test, is_form);
			var y = validate_eval(command, test, is_form);
			var r = x < y;
			if ( invert != !r && is_form && report ) {
				validate_eval(command_stack, test, is_form, x + " " + report + " BE LESS THAN " + y, invert, custom_error);
				validate_eval(command_stack, test, is_form, x + " " + report + " BE LESS THAN " + y, invert, custom_error);
			}
			return r;
		case "==":
			var x = validate_eval(command, test, is_form);
			var y = validate_eval(command, test, is_form);
			var r = x == y;
			if ( invert != !r && is_form && report ) {
				validate_eval(command_stack, test, is_form, x + " " + report + " BE EQUAL TO " + y, invert, custom_error);
				validate_eval(command_stack, test, is_form, x + " " + report + " BE EQUAL TO " + y, invert, custom_error);
			}
			return r;
		case ">=":
			var x = validate_eval(command, test, is_form);
			var y = validate_eval(command, test, is_form);
			var r = x >= y;
			if ( invert != !r && is_form && report ) {
				validate_eval(command_stack, test, is_form, x + " " + report + " BE GREATOR THAN OR EQUAL TO " + y, invert, custom_error);
				validate_eval(command_stack, test, is_form, x + " " + report + " BE GREATOR THAN OR EQUAL TO " + y, invert, custom_error);
			}
			return r;
		case "<=":
			var x = validate_eval(command, test, is_form);
			var y = validate_eval(command, test, is_form);
			var r = x <= y;
			if ( invert != !r && is_form && report ) {
				validate_eval(command_stack, test, is_form, x + " " + report + " BE LESS THAN OR EQUAL TO " + y, invert, custom_error);
				validate_eval(command_stack, test, is_form, x + " " + report + " BE LESS THAN OR EQUAL TO " + y, invert, custom_error);
			}
			return r;
		case "SUM":
			var fields = command.pop();
			fields = validate_parse(fields, -1);
			var value = 0;
			while ( fields )
				valid += validate_eval(fields, test, is_form, report?"TOTAL "+report:"", invert, custom_error);
			var r = valid;
			return r;
		case "+":
			var x = validate_eval(command, test, is_form, report?"TOTAL "+report:"", invert, custom_error);
			var y = validate_eval(command, test, is_form, report?"TOTAL "+report:"", invert, custom_error);
			var r = x + y;
			return r;
		case "-":
			var x = validate_eval(command, test, is_form, report?"DIFFERENCE "+report:"", invert, custom_error);
			var y = validate_eval(command, test, is_form, report?"DIFFERENCE "+report:"", invert, custom_error);
			var r = x - y;
			return r;
		case "*":
			var x = validate_eval(command, test, is_form, report?"PRODUCT "+report:"", invert, custom_error);
			var y = validate_eval(command, test, is_form, report?"PRODUCT "+report:"", invert, custom_error);
			var r = x * y;
			return r;
		case "/":
			var x = validate_eval(command, test, is_form, report?"QUOTENT "+report:"", invert, custom_error);
			var y = validate_eval(command, test, is_form, report?"QUOTENT "+report:"", invert, custom_error);
			var r = x / y;
			return r;
		case "%":
			var x = validate_eval(command, test, is_form, report?"QUOTENT "+report:"", invert, custom_error);
			var y = validate_eval(command, test, is_form, report?"QUOTENT "+report:"", invert, custom_error);
			var r = x % y;
			return r;
		case "**":
			var x = validate_eval(command, test, is_form, report?"POWER "+report:"", invert, custom_error);
			var y = validate_eval(command, test, is_form, report?"POWER "+report:"", invert, custom_error);
			var r = Math.pow(x, y);
			return r;
		default:
			if ( !isNaN(cmd) ) {
				var r = cmd;
				return r;
			}
			if ( cmd[0] == "'" && cmd[cmd.length-1] == "'" ) {
				var r = cmd.substring(1, cmd.length-1);
				return r;
			}
			if ( cmd[0] == "(" && cmd[cmd.length-1] == ")" ) {
				cmd = validate_parse(cmd, -1);
				var r = validate_eval(cmd, test, is_form, report, invert, custom_error);
				return r;
			}
			if ( cmd in test ) {
				if ( is_form ) {
					var r;
					if ( 'type' in test[cmd] ) {
						if ( custom_error )
							test[cmd].setCustomValidity(custom_error);
						else
							test[cmd].setCustomValidity(report);
						switch ( test[cmd].type ) {
							case 'checkbox':
								r = test[cmd].checked;
								if ( !r )
									throw "Checkbox not set: " + cmd;
								break;
							default:
								r = test[cmd].value
								break;
						}
					}
					else if ( test[cmd] instanceof RadioNodeList ) {
						r = false;
						for ( var i = 0; i < test[cmd].length; i ++ ) {
							r |= test[cmd][i].checked;
							if ( custom_error )
								test[cmd][i].setCustomValidity(custom_error);
							else
								test[cmd][i].setCustomValidity(report);
						}
						if ( !r )
							throw "Radio not set: " + cmd;
						r = test[cmd].value;
					}
					else {
						r = test[cmd].value;
						if ( custom_error )
							test[cmd].setCustomValidity(custom_error);
						else
							test[cmd].setCustomValidity(report);
					}
					return r;
				}
				else
					return test[cmd];
			}
			throw "Validate could not process: " + cmd;
	}
}

function validate(rule_string, test, is_form=true, report=true) {
	var valid = true;
	var command = validate_parse(rule_string);
	while ( command.length && valid ) {
		var command_stack = command.slice(0);
		valid &= validate_eval(command, test, is_form);
		if ( !valid && is_form && report ) {
			validate_eval(command_stack, test, is_form, "MUST");
			test.reportValidity();
		}
	}
	return valid;
}