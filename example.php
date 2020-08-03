<?php
include_once("DVS.php");
$DVS = <<<DVS
	NOT EMPTY username
	ERROR
		'Password must be 10+ characters and must contain at least one of each: lowercase, uppercase, number'
		MATCH '^((?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{10,})$' new_password
	ERROR
		'Passwords must match'
		== new_password cfm_password
	ALL (SET) (gender enable)
	MATCH '^.+ .+$' full_name
DVS;

$valid = "";
if ( !empty($_POST) )
	$valid = ": " . ( validate($DVS, $_POST) ? "VALID" : "INVALID" );
?><!DOCTYPE html>
<html>
<head>
	<script type="text/javascript">
		DVS = "<?= trim(preg_replace("/\s+/", " ", $DVS)) ?>";
	</script>
	<script src="DVS.js"></script>
	<style type="text/css">
		input:invalid, textarea:invalid {
			outline: 1px solid red;
		}
		table, tr, th, td {
			border: 1px solid black;
			border-collapse: collapse;
			padding: 5px;
		}
		th {
			text-align: right;
		}
	</style>
</head>
<body>
	<fieldset><legend>DVS</legend>
		<?= nl2br(preg_replace("/ /", "&nbsp;", preg_replace("/\t/", "&nbsp;&nbsp;&nbsp;&nbsp;", $DVS))) ?>
	</fieldset>
	<br /><br />
	<fieldset style="width: 45%;display:inline-block;"><legend>Form with JS validation</legend>
		<form method="post" onchange="validate(DVS, this);">
			Username: <input type="text" name="username" /><br />
			Password: <input type="password" name="new_password" /><br />
			Confirm: <input type="password" name="cfm_password" /><br />
			Sex: Male <input type="radio" name="gender" value="M" /> Female <input type="radio" name="gender" value="F" /><br />
			Enable: <input type="checkbox" name="enable" /><br />
			Full Name: <input type="text" name="full_name" /><br />
			<input type="submit" value="Save" />
		</form>
	</fieldset>
	<fieldset style="width: 45%;display:inline-block;"><legend>Form without JS validation ( test PHP )</legend>
		<form method="post">
			Username: <input type="text" name="username" /><br />
			Password: <input type="password" name="new_password" /><br />
			Confirm: <input type="password" name="cfm_password" /><br />
			Sex: Male <input type="radio" name="gender" value="M" /> Female <input type="radio" name="gender" value="F" /><br />
			Enable: <input type="checkbox" name="enable" /><br />
			Full Name: <input type="text" name="full_name" /><br />
			<input type="submit" value="Save" />
		</form>
	</fieldset>
	<br /><br />
	<fieldset><legend>Last Save<?= $valid ?></legend>
		<table><?php
		foreach( $_POST as $key => $value ) { ?>
			<tr>
				<th><?= $key ?></th>
				<td><?= var_export($value, true) ?></td>
			</tr><?php
		} ?>
	</fieldset>
</body>
</html>